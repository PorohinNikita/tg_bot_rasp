const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const schedule = require("node-schedule");

// URL сайта с расписаниями
const URL = "http://simfpolyteh.ru/schedule";

// Папка для сохранения изображений
const SAVE_DIR = "./schedules";

// Функция для скачивания изображения
const downloadImage = async (imageUrl, savePath) => {
  try {
    const response = await axios({
      url: imageUrl,
      method: "GET",
      responseType: "stream",
    });

    response.data.pipe(fs.createWriteStream(savePath));
    console.log(`Image saved to ${savePath}`);
  } catch (error) {
    console.log(`Failed to download image: ${imageUrl}`, error);
  }
};

// Универсальная функция для поиска элемента (по тегу и тексту внутри) и скачивания следующего изображения
const findAndDownloadImage = ($, tag, text, imgName) => {
  const element = $(`${tag}:contains("${text}")`);
  if (element.length > 0) {
    element.each((index, el) => {
      const parent = $(el).parent();
      const img = parent.find("img").first();
      if (img.length > 0) {
        imgUrl = img.attr("src");
        return false; // Break the loop once the image is found
      }
    });

    if (imgUrl) {
      let fullImageUrl = imgUrl;
      if (!imgUrl.startsWith("http")) {
        fullImageUrl = `http://simfpolyteh.ru${imgUrl}`;
      }

      const savePath = `${SAVE_DIR}/${imgName}.jpg`;
      downloadImage(fullImageUrl, savePath);
    } else {
      console.log(`No image found after <${tag}>${text}</${tag}>`);
    }
  } else {
    console.log(`<${tag}>${text}</${tag}> not found.`);
  }
};

// Функция для парсинга страницы и скачивания нужных изображений
const parseAndDownload = async () => {
  console.log(`Parsing started at ${new Date()}`);

  try {
    // Получаем HTML страницы
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    // Ищем и скачиваем изображения для "Первого корпуса"
    findAndDownloadImage($, "span", "Первый корпус", "firstCorpus");

    // Ищем и скачиваем изображения для "Второго корпуса"
    findAndDownloadImage($, "span", "Второй корпус", "secondCorpus");

    // Ищем и скачиваем изображения для "Расписание звонков"
    findAndDownloadImage($, "h2", "Расписание звонков", "bellSchedule");
  } catch (error) {
    console.error("Error parsing the schedule page:", error);
  }
};

// Создаём папку для сохранения, если она не существует
if (!fs.existsSync(SAVE_DIR)) {
  fs.mkdirSync(SAVE_DIR, { recursive: true });
}

// Планируем выполнение задачи каждые 15 минут
schedule.scheduleJob("*/1 * * * *", () => {
  parseAndDownload();
});

console.log("Scheduled parser is running...");
