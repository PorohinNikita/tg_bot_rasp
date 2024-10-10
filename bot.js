const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
console.log('Bot start!!!')
// Замените токен на ваш
const token = '7404654888:AAFuB-4RUhMSyDzeWPxk9U6qTZtnD3Mh0Y4';

// Создаем бота
const bot = new TelegramBot(token, { polling: true });

// Путь к папке с изображениями
const schedulePath = path.join(__dirname, 'schedules');

// Создаем клавиатуру с кнопками
const keyboard = [
    ['1 корпус', '2 корпус'],
    ['Расписание звонков' , 'Пожертвования'],
];

// Отправляем клавиатуру пользователю
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Выберите расписание:', {
        reply_markup: {
            keyboard: keyboard,
            one_time_keyboard: true,
            resize_keyboard: true,
        },
    });
});

// Обработка текстовых сообщений
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    switch (text) {
        case '1 корпус':
            bot.sendPhoto(chatId, path.join(schedulePath, "firstCorpus.jpg"));
            break;
        case '2 корпус':
            bot.sendPhoto(chatId, path.join(schedulePath, "secondCorpus.jpg"));
            break;
        case 'Расписание звонков':
            bot.sendPhoto(chatId, path.join(schedulePath, "bellSchedule.jpg"));
            break;
            case 'Пожертвования':
                bot.sendMessage(chatId, 'Спасибо за ваше желание поддержать! Вот ссылка на пожертвования: https://www.tinkoff.ru/rm/porokhin.nikita9/ntKCm17859');
                break;
        default:
            bot.sendMessage(chatId, 'Пожалуйста, выберите расписание из меню.');
            break;
    }
});
