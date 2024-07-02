require('dotenv').config();
const { Bot } = require('grammy');
const { schedule } = require('node-cron');

const bot = new Bot(process.env.BOT_TOKEN); // Токен бота в .env файле
const groupTitle1 = 'Test KiberOne';
const groupTitle2 = 'test 2.0';
// const groupTitle3 = 'your_group_3';
// const groupTitle4 = 'your_group_4';
const groups = [groupTitle1, groupTitle2]; // Добавьте сюда заголовки групп
const notifyUserId = 5341935248; // ID пользователя, которому надо отправлять уведомления

let homeworkInfo = {}; // Для хранения информации о домашке

// Проверка наличия токена
if (!process.env.BOT_TOKEN) {
    console.error("Error: BOT_TOKEN is not defined in the .env file");
    process.exit(1);
}

// Инициализация информации о домашке для каждой группы
groups.forEach(groupTitle => {
    homeworkInfo[groupTitle] = { sent: false, details: null };
});

// Обработка входящих сообщений
bot.on('message', async (ctx) => {
    const messageText = ctx.message.text || ctx.message.caption; // Текст или подпись сообщения
    const chatTitle = ctx.message.chat.title;
    const hasPhoto = ctx.message.photo && ctx.message.photo.length > 0;

    if (messageText && messageText.includes('#homework') && groups.includes(chatTitle)) {
        const date = new Date(ctx.message.date * 1000); // Telegram возвращает время в Unix формате
        const formattedDate = date.toLocaleString();

        // Сохранение информации о домашке
        homeworkInfo[chatTitle] = {
            sent: true,
            details: {
                date: formattedDate,
                title: ctx.message.chat.title,
                username: ctx.message.from.username,
                messageId: ctx.message.message_id,
                link: `https://t.me/c/${String(ctx.message.chat.id).substring(4)}/${ctx.message.message_id}`, // Генерация ссылки на сообщение
                hasPhoto: hasPhoto
            }
        };

        // Логируем, что сообщение обнаружено
        console.log(`Detected homework message from teacher in group ${chatTitle}. Date and time: ${formattedDate}`);

        // Отправка уведомления пользователю
        await bot.api.sendMessage(notifyUserId, `Учитель (@${homeworkInfo[chatTitle].details.username}) скинул домашку в группу ${homeworkInfo[chatTitle].details.title}.\nДата и время: ${formattedDate}\nСсылка на сообщение: ${homeworkInfo[chatTitle].details.link}${hasPhoto ? '\nФото прикреплено.' : '\nФото не прикреплено.'}`);
        console.log('Notification sent to user successfully');

        // Пересылка сообщения с домашкой пользователю
        await bot.api.forwardMessage(notifyUserId, ctx.message.chat.id, ctx.message.message_id);
        console.log('Homework message forwarded to user successfully');
    }
});

// Установка задачи для проверки каждую минуту
schedule('* * * * *', async () => {
    let groupsWithoutHomework = [];

    for (const groupTitle of groups) {
        if (!homeworkInfo[groupTitle].sent) {
            groupsWithoutHomework.push(homeworkInfo[groupTitle].details ? homeworkInfo[groupTitle].details.title : groupTitle);
            await bot.api.sendMessage(notifyUserId, `Учитель не отправил домашку в группу ${homeworkInfo[groupTitle].details ? homeworkInfo[groupTitle].details.title : groupTitle}`);
            console.log(`No homework notification sent to user for group ${groupTitle} successfully`);
        } else {
            await bot.api.sendMessage(notifyUserId, `Учитель отправил домашку в группу ${homeworkInfo[groupTitle].details.title}`);
            console.log(`Homework notification sent to user for group ${groupTitle} successfully`);
        }
    }

    if (groupsWithoutHomework.length > 0) {
        await bot.api.sendMessage(notifyUserId, `Учитель не отправил домашку в следующие группы: ${groupsWithoutHomework.join(', ')}`);
        console.log('Notification sent: Учитель не отправил домашку в следующие группы:', groupsWithoutHomework.join(', '));
    }

    // Сбрасываем флаг на следующую минуту
    groups.forEach(groupTitle => {
        homeworkInfo[groupTitle].sent = false;
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