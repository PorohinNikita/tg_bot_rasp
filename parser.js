const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const schedule = require('node-schedule');

// URL сайта с расписаниями
const URL = 'http://simfpolyteh.ru/schedule';

// Папка для сохранения изображений
const SAVE_DIR = './schedules';

// Функция для скачивания изображения
const downloadImage = async (imageUrl, savePath) => {
  try {
    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'stream',
    });

    response.data.pipe(fs.createWriteStream(savePath));

    console.log(`Image saved to ${savePath}`);
  } catch (error) {
    console.log(`Failed to download image: ${imageUrl}`, error);
  }
};

// Функция для парсинга страницы и скачивания изображений расписаний
const parseAndDownload = async () => {
  console.log(`Parsing started at ${new Date()}`);

  try {
    // Получаем HTML страницы
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    // Находим все изображения на странице (можно добавить фильтрацию по корпусам)
    $('img').each((index, element) => {
      const imgUrl = $(element).attr('src');

      // Если ссылка относительная, дополняем её базовым URL
      let fullImageUrl = imgUrl;
      if (!imgUrl.startsWith('http')) {
        fullImageUrl = `http://simfpolyteh.ru${imgUrl}`;
      }

      // Генерируем путь для сохранения изображения
      const savePath = `${SAVE_DIR}/schedule_${index + 1}.jpg`;

      // Скачиваем и заменяем изображения
      downloadImage(fullImageUrl, savePath);
    });
  } catch (error) {
    console.error('Error parsing the schedule page:', error);
  }
};

// Создаём папку для сохранения, если она не существует
if (!fs.existsSync(SAVE_DIR)) {
  fs.mkdirSync(SAVE_DIR, { recursive: true });
}

// Планируем выполнение задачи каждый день в 15:00 по Москве
schedule.scheduleJob('0 * * * *', () =>  {
  parseAndDownload();
});

console.log('Scheduled parser is running...');
