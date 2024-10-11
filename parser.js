const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { notifySubscribers } = require("./bot");
const schedule = require("node-schedule");

const URL = "http://simfpolyteh.ru/schedule";
const SAVE_DIR = "./schedules";
const db = new sqlite3.Database("./bot.db");

// Функция для подсчета хеша изображения
const calculateHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
};

// Функция для проверки и обновления хеша изображения
const checkAndUpdateImage = async (imgName) => {
  const filePath = path.join(SAVE_DIR, `${imgName}.jpg`);
  const newHash = await calculateHash(filePath);

  db.get(
    `SELECT hash FROM image_hashes WHERE name = ?`,
    [imgName],
    (err, row) => {
      if (err) {
        console.error("Ошибка при проверке хеша:", err);
        return;
      }

      const oldHash = row ? row.hash : null;

      if (oldHash !== newHash) {
        db.run(
          `INSERT OR REPLACE INTO image_hashes (name, hash) VALUES (?, ?)`,
          [imgName, newHash],
          (err) => {
            if (err) {
              console.error("Ошибка при обновлении хеша:", err);
            } else {
              notifySubscribers(`Расписание для ${imgName} обновлено!`, filePath);
            }
          }
        );
      } else {
        console.log(
          `Хеш для ${imgName} не изменился, уведомления не требуются.`
        );
      }
    }
  );
};


// Функция для скачивания изображения
const downloadImage = async (imageUrl, savePath) => {
  try {
    const response = await axios({
      url: imageUrl,
      method: "GET",
      responseType: "stream",
    });

    await new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(savePath);
      response.data.pipe(stream);
      stream.on("finish", resolve);
      stream.on("error", reject);
    });
    console.log(`Image saved to ${savePath}`);
  } catch (error) {
    console.log(`Failed to download image: ${imageUrl}`, error);
  }
};

// Универсальная функция для поиска элемента и скачивания следующего изображения
const findAndDownloadImage = async ($, tag, text, imgName) => {
  let imgUrl = null;
  const element = $(`${tag}:contains("${text}")`);

  if (element.length > 0) {
    element.each((index, el) => {
      const parent = $(el).parent();
      const img = parent.find("img").first();
      if (img.length > 0) {
        imgUrl = img.attr("src");
        return false; // Прерываем цикл после нахождения изображения
      }
    });

    if (imgUrl) {
      let fullImageUrl = imgUrl;
      if (!imgUrl.startsWith("http")) {
        fullImageUrl = `http://simfpolyteh.ru${imgUrl}`;
      }

      const savePath = path.join(SAVE_DIR, `${imgName}.jpg`);
      await downloadImage(fullImageUrl, savePath);
      await checkAndUpdateImage(imgName); // Проверяем изменения хеша после загрузки
    }
  } else {
    console.log(`Изображение для ${text} не найдено.`);
  }
};

// Парсинг и загрузка изображений
const parseAndDownload = async () => {
  try {
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    await findAndDownloadImage($, "span", "Первый корпус", "firstCorpus");
    await findAndDownloadImage($, "span", "Второй корпус", "secondCorpus");
    await findAndDownloadImage($, "h2", "Расписание звонков", "bellSchedule");
  } catch (error) {
    console.error("Error parsing the schedule page:", error);
  }
};

// Создаем папку для сохранения, если она не существует
if (!fs.existsSync(SAVE_DIR)) {
  fs.mkdirSync(SAVE_DIR, { recursive: true });
}

// Запускаем задачу каждые 10 секунд
schedule.scheduleJob("*/1 * * * *", async () => {
  try {
    await parseAndDownload();
    console.log("Задача выполнена");
  } catch (error) {
    console.error("Ошибка во время выполнения задачи:", error);
  }
});

console.log("Scheduled parser is running...");
