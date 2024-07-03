require('dotenv').config();
const { Bot } = require('grammy');
const { schedule } = require('node-cron');

const bot = new Bot(process.env.BOT_TOKEN); // Токен бота в .env файле
const groupTitle1 = 'Test KiberOne';
const groupTitle2 = 'test 2.0';
const groups = [groupTitle1, groupTitle2]; // Добавьте сюда заголовки групп
const notifyUserId = 5341935248; // ID пользователя, которому надо отправлять уведомления

let homeworkInfo = {}; // Для хранения информации о домашке

// Проверка наличия токена
if (!process.env.BOT_TOKEN) {
    console.error("Ошибка: BOT_TOKEN не определен в .env файле");
    process.exit(1);
}

// Инициализация информации о домашке для каждой группы
groups.forEach(groupTitle => {
    homeworkInfo[groupTitle] = { homework: false, googledisck: false, tema: false, details: null, hasPhoto: false }; // Добавлен флаг hasPhoto для хранения информации о наличии фото
});

// Обработка входящих сообщений
bot.on('message', async (ctx) => {
    const messageText = ctx.message.text || ctx.message.caption; // Текст или подпись сообщения
    const chatTitle = ctx.message.chat.title;
    const hasPhoto = ctx.message.photo && ctx.message.photo.length > 0;

    if (messageText && groups.includes(chatTitle)) {
        const date = new Date(ctx.message.date * 1000); // Telegram возвращает время в Unix формате
        const formattedDate = date.toLocaleString();

        let type = null;

        // Проверка и сохранение информации по хэштегам
        if (messageText.includes('#homework')) {
            homeworkInfo[chatTitle].homework = true;
            type = 'домашку';
            homeworkInfo[chatTitle].hasPhoto = hasPhoto; // Добавляем информацию о наличии фото
        }

        if (messageText.includes('#googledisck')) {
            homeworkInfo[chatTitle].googledisck = true;
            type = 'Google Disk';
            homeworkInfo[chatTitle].hasPhoto = hasPhoto; // Добавляем информацию о наличии фото
        }

        if (messageText.includes('#tema')) {
            homeworkInfo[chatTitle].tema = true;
            type = 'тему';
        }

        if (type) {
            // Сохранение информации о сообщении
            homeworkInfo[chatTitle].details = {
                date: formattedDate,
                title: ctx.message.chat.title,
                username: ctx.message.from.username,
                messageId: ctx.message.message_id,
                link: `https://t.me/c/${String(ctx.message.chat.id).substring(4)}/${ctx.message.message_id}`, // Генерация ссылки на сообщение
                hasPhoto: hasPhoto
            };

            // Логируем, что сообщение обнаружено
            console.log(`Обнаружено сообщение типа ${type} от учителя в группе ${chatTitle}. Дата и время: ${formattedDate}`);

            // Отправка уведомления пользователю
            let notificationMessage = `Учитель (@${homeworkInfo[chatTitle].details.username}) скинул ${type} в группу ${homeworkInfo[chatTitle].details.title}.\nДата и время: ${formattedDate}\nСсылка на сообщение: ${homeworkInfo[chatTitle].details.link}`;
            
            if (type === 'домашку' || type === 'Google Disk') {
                notificationMessage += homeworkInfo[chatTitle].hasPhoto ? '\nФото прикреплено.' : '\nФото не прикреплено.';
            }

            await bot.api.sendMessage(notifyUserId, notificationMessage);
            console.log('Уведомление успешно отправлено пользователю');

            // Пересылка сообщения пользователю
            await bot.api.forwardMessage(notifyUserId, ctx.message.chat.id, ctx.message.message_id);
            console.log('Сообщение успешно переслано пользователю');
        }
    }
});

// Установка задачи для проверки каждую минуту
schedule('* * * * *', async () => {
    let groupsWithoutHomework = [];
    let groupsWithoutGoogledisckPhoto = [];
    let groupsWithoutTema = [];

    for (const groupTitle of groups) {
        if (!homeworkInfo[groupTitle].homework) {
            groupsWithoutHomework.push(homeworkInfo[groupTitle].details ? homeworkInfo[groupTitle].details.title : groupTitle);
        }
        if (!homeworkInfo[groupTitle].googledisck) {
            groupsWithoutGoogledisckPhoto.push(homeworkInfo[groupTitle].details ? homeworkInfo[groupTitle].details.title : groupTitle);
        }
        if (!homeworkInfo[groupTitle].tema) {
            groupsWithoutTema.push(homeworkInfo[groupTitle].details ? homeworkInfo[groupTitle].details.title : groupTitle);
        }
    }

    let notificationMessage = '';

    if (groupsWithoutHomework.length > 0) {
        notificationMessage += `Учитель не отправил домашку в следующие группы: ${groupsWithoutHomework.join(', ')}\n`;
    }

    if (groupsWithoutGoogledisckPhoto.length > 0) {
        notificationMessage += `Учитель не прикрепил фото к сообщениям с хэштегом #googledisck в следующие группы: ${groupsWithoutGoogledisckPhoto.join(', ')}\n`;
    }

    if (groupsWithoutTema.length > 0) {
        notificationMessage += `Учитель не отправил тему в следующие группы: ${groupsWithoutTema.join(', ')}\n`;
    }

    if (notificationMessage) {
        await bot.api.sendMessage(notifyUserId, notificationMessage.trim());
        console.log('Сводное уведомление успешно отправлено пользователю');
    }

    // Сбрасываем флаги на следующую минуту
    groups.forEach(groupTitle => {
        homeworkInfo[groupTitle].homework = false;
        homeworkInfo[groupTitle].googledisck = false;
        homeworkInfo[groupTitle].tema = false;
        homeworkInfo[groupTitle].hasPhoto = false; // Сбрасываем также флаг наличия фото
    });
});

bot.start();





// bot.on('msg',async(ctx)=>{
//     console.log(ctx.msg)   // что бы увидеть сообщение (ID, текст, дата)
// })


// Установка задачи для проверки каждое воскресенье
// schedule('59 23 * * 0', () => {
//     if (!homeworkSent) {
//         bot.api.sendMessage(notifyUserId, `Учитель (${homeworkInfo.username}) не отправил домашку в группу ${homeworkInfo.title}`)
//             .then(() => console.log('No homework notification sent to user successfully'))
//             .catch(err => console.error('Failed to send message:', err));
//     }
//     // Сбрасываем флаг на следующую неделю
//     homeworkSent = false;
// });