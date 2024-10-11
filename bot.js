const TelegramBot = require("node-telegram-bot-api");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const crypto = require("crypto");

console.log("Bot start!!!");
const token = "7404654888:AAFuB-4RUhMSyDzeWPxk9U6qTZtnD3Mh0Y4";
const bot = new TelegramBot(token, { polling: true });
const db = new sqlite3.Database("./bot.db");
const schedulePath = path.join(__dirname, "schedules");

const keyboard = [
  ["1 корпус", "2 корпус"],
  ["Расписание звонков", "Пожертвования"],
  ["Подписаться на обновления", "Отписаться от обновлений"],
];

// Инициализация базы данных
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (chat_id INTEGER PRIMARY KEY)`);
  db.run(
    `CREATE TABLE IF NOT EXISTS image_hashes (name TEXT PRIMARY KEY, hash TEXT)`
  );
});

// Отправляем клавиатуру пользователю
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Выберите расписание или подпишитесь на обновления:",
    {
      reply_markup: {
        keyboard: keyboard,
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    }
  );
});

// Функция для добавления пользователя в список подписок
bot.onText(/Подписаться на обновления/, (msg) => {
  const chatId = msg.chat.id;

  db.run(
    `INSERT OR IGNORE INTO users (chat_id) VALUES (?)`,
    [chatId],
    function (err) {
      if (err) {
        return bot.sendMessage(chatId, "Ошибка при добавлении в подписку.");
      }
      bot.sendMessage(
        chatId,
        "Вы успешно подписались на обновления расписания."
      );
    }
  );
});
bot.onText(/Отписаться от обновлений/, (msg) => {
  const chatId = msg.chat.id;

  db.run(`DELETE FROM users WHERE chat_id = ?`, [chatId], function (err) {
    if (err) {
      return bot.sendMessage(chatId, "Ошибка при удалении из подписки.");
    }
    bot.sendMessage(chatId, "Вы успешно отписались от обновлений расписания.");
  });
});

// Функция для отправки уведомлений подписчикам
const notifySubscribers = (message, filePath) => {
  db.each(`SELECT chat_id FROM users`, (err, row) => {
    if (err) {
      console.error("Ошибка при получении подписчиков:", err);
    } else {
      bot.sendPhoto(row.chat_id, filePath, { caption: message }, (err, res) => {
        if (err) {
          console.error("Ошибка при отправке фото:", err);
        } else {
          console.log(`Фото отправлено пользователю ${row.chat_id}`);
        }
      });
    }
  });
};


// Обработка текстовых сообщений
// Обработка текстовых сообщений с использованием регулярных выражений
bot.onText(/1 корпус/, (msg) => {bot.sendPhoto(msg.chat.id, path.join(schedulePath, "firstCorpus.jpg"))
    .catch(error => {console.error(`Ошибка при отправке фото:`, error);});});

bot.onText(/2 корпус/, (msg) => {bot.sendPhoto(msg.chat.id, path.join(schedulePath, "secondCorpus.jpg"))
    .catch(error => {console.error(`Ошибка при отправке фото:`, error);});});

bot.onText(/Расписание звонков/, (msg) => {bot.sendPhoto(msg.chat.id, path.join(schedulePath, "bellSchedule.jpg"))
    .catch(error => {console.error(`Ошибка при отправке фото:`, error);});});

bot.onText(/Пожертвования/, (msg) => {bot.sendMessage(msg.chat.id, "Спасибо за ваше желание поддержать! Вот ссылка на пожертвования: https://www.tinkoff.ru/rm/porokhin.nikita9/ntKCm17859")
    .catch(error => {console.error(`Ошибка при отправке сообщения:`, error);})});

module.exports = { notifySubscribers };
