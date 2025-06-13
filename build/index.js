require('dotenv').config();
const fs = require('fs');
const { Telegraf, Markup } = require('telegraf');

const AllowedChatsFilePath = '/app/config/chats.json';
const PendingCaptchasFilePath = '/app/config/pending_captchas.json';
const mainAdmin = parseInt(process.env.MAIN_ADMIN);
const botID = parseInt(process.env.BOT_ID);

let AllowedChats = [];
let PendingCaptchas = {};
let CaptchaTimeouts = {}; // Хранилище таймаутов

const bot = new Telegraf(process.env.BOT_TOKEN, {
    handlerTimeout: Infinity
});

// Массив чисел с их произношением
const arr = [
    { num: 1, pron: 'один' }, { num: 2, pron: 'два' }, { num: 3, pron: 'три' }, 
    { num: 4, pron: 'четыре' }, { num: 5, pron: 'пять' }, { num: 6, pron: 'шесть' }, 
    { num: 7, pron: 'семь' }, { num: 8, pron: 'восемь' }, { num: 9, pron: 'девять' }, 
    { num: 10, pron: 'десять' }, { num: 11, pron: 'одиннадцать' }, { num: 12, pron: 'двенадцать' },
    { num: 13, pron: 'тринадцать' }, { num: 14, pron: 'четырнадцать' }, { num: 15, pron: 'пятнадцать' },
    { num: 16, pron: 'шестнадцать' }, { num: 17, pron: 'семнадцать' }, { num: 18, pron: 'восемнадцать' },
    { num: 19, pron: 'девятнадцать' }, { num: 20, pron: 'двадцать' }, { num: 21, pron: 'двадцать один' },
    { num: 22, pron: 'двадцать два' }, { num: 23, pron: 'двадцать три' }, { num: 24, pron: 'двадцать четыре' },
    { num: 25, pron: 'двадцать пять' }, { num: 26, pron: 'двадцать шесть' }, { num: 27, pron: 'двадцать семь' },
    { num: 28, pron: 'двадцать восемь' }, { num: 29, pron: 'двадцать девять' }, { num: 30, pron: 'тридцать' },
    { num: 31, pron: 'тридцать один' }, { num: 32, pron: 'тридцать два' }, { num: 33, pron: 'тридцать три' },
    { num: 34, pron: 'тридцать четыре' }, { num: 35, pron: 'тридцать пять' }, { num: 36, pron: 'тридцать шесть' },
    { num: 37, pron: 'тридцать семь' }, { num: 38, pron: 'тридцать восемь' }, { num: 39, pron: 'тридцать девять' },
    { num: 40, pron: 'сорок' }, { num: 41, pron: 'сорок один' }, { num: 42, pron: 'сорок два' },
    { num: 43, pron: 'сорок три' }, { num: 44, pron: 'сорок четыре' }, { num: 45, pron: 'сорок пять' },
    { num: 46, pron: 'сорок шесть' }, { num: 47, pron: 'сорок семь' }, { num: 48, pron: 'сорок восемь' },
    { num: 49, pron: 'сорок девять' }, { num: 50, pron: 'пятьдесят' }
];

async function loadAllowedChats() {
    try {
        if (!fs.existsSync(AllowedChatsFilePath)) {
            AllowedChats = [];
            return [];
        }

        const data = fs.readFileSync(AllowedChatsFilePath, 'utf8');
        if (!data.trim()) {
            AllowedChats = [];
            return [];
        }

        AllowedChats = JSON.parse(data);
        return AllowedChats;
    } catch (err) {
        console.error(`Error when loading Allowed Chats File:`, err);
        return [];
    }
}

async function loadPendingCaptchas() {
    try {
        if (!fs.existsSync(PendingCaptchasFilePath)) {
            PendingCaptchas = {};
            return {};
        }

        const data = fs.readFileSync(PendingCaptchasFilePath, 'utf8');
        if (!data.trim()) {
            PendingCaptchas = {};
            return {};
        }

        PendingCaptchas = JSON.parse(data);
        return PendingCaptchas;
    } catch (err) {
        console.error(`Error when loading Pending Captchas File:`, err);
        return {};
    }
}

async function savePendingCaptchas() {
    try {
        const dir = '/app/config';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(PendingCaptchasFilePath, JSON.stringify(PendingCaptchas, null, 2));
    } catch (err) {
        console.error(`Error saving pending captchas:`, err);
    }
}

async function userRestrictions(ctx, userId, chatId, permissions, untilDate = 0) {
    try {
        let restrictDate = 0;
        if (untilDate !== 0) {
            restrictDate = Math.floor(Date.now() / 1000) + untilDate;
        }

        await ctx.telegram.restrictChatMember(chatId, userId, {
            until_date: restrictDate,
            can_send_messages: permissions.can_send_messages || false,
            can_send_audios: permissions.can_send_audios || false,
            can_send_documents: permissions.can_send_documents || false,
            can_send_photos: permissions.can_send_photos || false,
            can_send_videos: permissions.can_send_videos || false,
            can_send_video_notes: permissions.can_send_video_notes || false,
            can_send_voice_notes: permissions.can_send_voice_notes || false,
            can_send_polls: permissions.can_send_polls || false,
            can_send_other_messages: permissions.can_send_other_messages || false,
            can_add_web_page_previews: permissions.can_add_web_page_previews || false,
            can_change_info: false,
            can_invite_users: false,
            can_pin_messages: false,
            can_manage_topics: false
        });
    } catch (error) {
        console.error(`Error restricting user ${userId} in chat ${chatId}:`, error.description);
    }
}

async function generateQuestion() {
    try {
        const options = [];
        
        // Генерация уникальных чисел от 5 до 50
        while (options.length < 4) {
            let randomNumber = Math.floor(Math.random() * 46) + 5; // 5-50
            if (!options.includes(randomNumber)) {
                options.push(randomNumber);
            }
        }

        const correctAnswer = options[Math.floor(Math.random() * options.length)];

        // Генерация sum1 и sum2
        let sum1 = Math.floor(Math.random() * (correctAnswer - 1)) + 1;
        const sum2 = correctAnswer - sum1;

        // Находим произношение чисел
        const ciferka1 = arr.find(item => item.num === sum1)?.pron || sum1.toString();
        const ciferka2 = arr.find(item => item.num === sum2)?.pron || sum2.toString();

        const question = `Выберите число, которое является суммой двух чисел: <b>${ciferka1}</b> и <b>${ciferka2}</b>\n\nУ вас одна минута на ответ.`;
        
        return { question, correctAnswer, options };
    } catch (error) {
        console.error(`Error при вычислении капчи:`, error);
        return null;
    }
}

async function escapeHtml(text) {
    try {
        return text.replace(/[&<>"'\/]/g, function(match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;',
                '/': '&#x2F;'
            }[match];
        });
    } catch (error) {
        console.error(`Error при экранировании символов:`, error);
        return text;
    }
}

function getTimeEKB() {
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String((date.getUTCHours() + 5) % 24).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

    return `[${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds} (EKB)]`;
}

async function logMessage(eventName, msg) {
    const date = getTimeEKB();
    const logMessage = `${date} ${eventName}: ${msg}\n`;
    
    // Создаем директорию если её нет
    const logDir = '/app/log';
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFile('/app/log/main.log', logMessage, (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
        }
    });
}

async function deleteMessage(ctx, chatId, msgId, source) {
    let chat_link = `https://t.me/c/${chatId.toString().slice(4)}/${msgId}`;
    try {
        await bot.telegram.deleteMessage(chatId, msgId);
    } catch (error) {
        if (error.code === 400) {
            await logMessage(`Error 400 deleting message ${msgId} in chat ${chatId}, Link: ${chat_link} source: ${source}`, error.description);
        } else {
            await logMessage(`Error deleting message ${msgId} in chat ${chatId}, Link: ${chat_link} source: ${source}`, error.description);
        }
    }
}

async function userFriendly(user) {
    try {
        let username = user.username ? user.username : ""    
        let first_name = user.first_name ? user.first_name : "";
        let last_name = user.last_name ? user.last_name : "";
        let fullname = first_name + " " + last_name    
        return { userName: username, firstName: first_name, lastName: last_name, fullName: fullname }
    } catch (error) {
        console.error('Error UserFriendly', error);
        return { userName: 'undefined', firstName: 'undefined', lastName: 'undefined', fullName: 'undefined' }
    }
}

// Функция для очистки всех данных капчи
async function clearCaptchaData(chatId, userId) {
    const key = `${chatId}_${userId}`;
    
    // Очищаем таймаут
    if (CaptchaTimeouts[key]) {
        clearTimeout(CaptchaTimeouts[key]);
        delete CaptchaTimeouts[key];
    }
    
    // Удаляем из pending
    delete PendingCaptchas[key];
    await savePendingCaptchas();
}

// Функция для установки таймаута на капчу
async function setCaptchaTimeout(chatId, userId, messageId) {
    const key = `${chatId}_${userId}`;
    
    const timeoutId = setTimeout(async () => {
        try {
            // Проверяем, что капча еще активна
            if (PendingCaptchas[key]) {
                // Удаляем сообщение с капчей
                await deleteMessage({ telegram: bot.telegram }, chatId, messageId, 'timeout');
                
                // Баним пользователя
                await bot.telegram.banChatMember(chatId, userId);
                
                await logMessage(`Пользователь ${userId} забанен за неответ на капчу в чате ${chatId}`, '');
                
                // Очищаем все данные капчи
                await clearCaptchaData(chatId, userId);
            }
        } catch (error) {
            console.error('Error in captcha timeout:', error);
        }
    }, 60000); // 1 минута

    // Сохраняем ID таймаута
    CaptchaTimeouts[key] = timeoutId;
    return timeoutId;
}

bot.on('chat_member', async (ctx) => {
    try {
        const update = ctx.update.chat_member;
        const newMember = update.new_chat_member;
        const oldMember = update.old_chat_member;
        const chatId = update.chat.id;
        const allowedChats = await loadAllowedChats();

        // Пропускаем, если пользователь не стал полноценным участником (member)
        if (newMember.status !== 'member') return;

        const userId = newMember.user.id;

        // Проверяем, что чат в разрешенном списке
        if (!allowedChats.includes(chatId)) return;

        // Проверяем, кто добавил пользователя
        const addedBy = update.from;
        
        // Если пользователя добавил главный администратор - пропускаем капчу
        if (addedBy && addedBy.id === mainAdmin) {
            await logMessage(`Пользователь ${userId} добавлен главным администратором ${mainAdmin}, капча пропущена`, `Чат: ${chatId}`);
            return;
        }

        // Полностью ограничиваем пользователя
        await userRestrictions(ctx, userId, chatId, {
            can_send_messages: false,
            can_send_audios: false,
            can_send_documents: false,
            can_send_photos: false,
            can_send_videos: false,
            can_send_video_notes: false,
            can_send_voice_notes: false,
            can_send_polls: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false
        }, 0);

        const questionData = await generateQuestion();
        if (!questionData) return;

        const { question, correctAnswer, options } = questionData;
        const buttons = options.map(option =>
            Markup.button.callback(option, `answer_${option === correctAnswer ? 'correct' : 'incorrect'}_${userId}`)
        );

        const firstname_clear = await escapeHtml(newMember.user.first_name);
        const message = await ctx.replyWithHTML(
            `Добро пожаловать ${newMember.user.username
                ? "@" + newMember.user.username
                : `<a href="tg://user?id=${userId}">${firstname_clear}</a>`}\n\n${question}`,
            Markup.inlineKeyboard(buttons).oneTime().resize()
        );

        // Сохраняем информацию о капче
        const key = `${chatId}_${userId}`;
        PendingCaptchas[key] = {
            chatId: chatId,
            userId: userId,
            messageId: message.message_id,
            correctAnswer: correctAnswer,
            timestamp: Date.now()
        };
        await savePendingCaptchas();

        // Устанавливаем таймаут
        const timeoutId = await setCaptchaTimeout(chatId, userId, message.message_id);

    } catch (error) {
        console.error('Ошибка в chat_member:', error);
    }
});

bot.on('my_chat_member', async (ctx) => {
    try {
        const chatMember = ctx.myChatMember;
        const newChatMember = chatMember.new_chat_member;
        let chat_link = chatMember.chat.username ? "https://t.me/" + chatMember.chat.username : "https://t.me/c/" + ctx.chat.id.toString().substring(4);

        if (newChatMember.status === 'member' && chatMember.chat.type !== 'private') {
            const addedBy = ctx.update.my_chat_member.from;

            if (addedBy.id !== mainAdmin) {
                try {
                    let first_name = addedBy.first_name ? addedBy.first_name : addedBy.id;
                    let _user = addedBy.username ? "@" + addedBy.username : first_name;
                    let text = `Бот был добавлен в чат не из списка <a href="${chat_link}"><b>${chatMember.chat.title}</b></a>\nПользователем: <a href="tg://user?id=${addedBy.id}">${_user}</a>\nID группы: <code>${ctx.chat.id}</code>`;
                    
                    if (mainAdmin) {
                        await bot.telegram.sendMessage(mainAdmin, text, {
                            parse_mode: 'HTML'
                        });
                    }

                    let msg = `Благодарим вас за проявленный интерес к этому боту\n\n`;
                    msg += `Вы не можете использовать этого бота в своей группе\n\n`;
                    msg += `Но вы можете самостоятельно <a href="https://github.com/Bigmanekb/telegram-delete-newmember-notify-bot">развернуть его на своем сервере</a>`;
                    await ctx.replyWithHTML(msg);
                    
                    console.error(`Bot was added to unlisted group ${chatMember.chat.title} ${chat_link} By User: ${addedBy.id}`, JSON.stringify(chatMember.chat));
                    await ctx.leaveChat();
                } catch (err) {
                    console.error(`Error while leaving unlisted group ${chatMember.chat.title}`, err);
                }
            }
        }
    } catch (error) {
        console.error(`Error on my_chat_member:`, error);
    }
});

bot.on('new_chat_members', async (ctx) => {
    try {
        const chatId = ctx.message.chat.id;
        const allowedChats = await loadAllowedChats();

        if (!allowedChats.includes(chatId)) return;

        const isBotAdded = ctx.message.new_chat_members.some(member => member.id === botID);
        if (isBotAdded) return;

        if (ctx.message && ctx.message.message_id) {
            await bot.telegram.deleteMessage(chatId, ctx.message.message_id);
        }
    } catch (error) {
        console.error(`Error on new_chat_members event:`, error);
    }
});

bot.on('left_chat_member', async (ctx) => {
    try {
        const chatId = ctx.message.chat.id;
        const allowedChats = await loadAllowedChats();

        if (!allowedChats.includes(chatId)) return;

        if (ctx.message && ctx.message.message_id) {
            await bot.telegram.deleteMessage(chatId, ctx.message.message_id);
        }
    } catch (error) {
        console.error(`Error on left_chat_members event:`, error);
    }
});

bot.action(/^answer_(correct|incorrect)_(.+)$/, async (ctx) => {
    try {
        const chatId = ctx.chat.id;
        const user = ctx.callbackQuery.from;
        const [match, answerStatus, userId] = ctx.match;
        const _user = await userFriendly(user);
        const isCorrectAnswer = answerStatus === 'correct';
        const targetUser = parseInt(userId) === user.id;
        const allowedChats = await loadAllowedChats();

        let chat_link = ctx.callbackQuery.message.chat.username ? 
            "Чат: https://t.me/" + ctx.callbackQuery.message.chat.username : 
            "Чат: https://t.me/c/" + chatId.toString().substring(4);

        const key = `${chatId}_${userId}`;

        if (isCorrectAnswer && allowedChats.includes(chatId) && targetUser) {
            await ctx.answerCbQuery(`🔥 Теперь вы можете писать в чат\n\nВ течение первых 4 часов, вы можете писать только текст 🗒\n\nФото и прочее вам станут доступны через 4 часа ⏱\n\nПравила: https://sprut.ai/pravila`, { 
                show_alert: true, 
                cache_time: 30 
            });

            try {
                // Разрешаем только текстовые сообщения на 4 часа
                await userRestrictions(ctx, user.id, chatId, {
                    can_send_messages: true,
                    can_send_audios: false,
                    can_send_documents: false,
                    can_send_photos: false,
                    can_send_videos: false,
                    can_send_video_notes: false,
                    can_send_voice_notes: false,
                    can_send_polls: false,
                    can_send_other_messages: false,
                    can_add_web_page_previews: false
                }, 14400); // 4 часа = 14400 секунд

                await logMessage(`Пользователь ${user.id}, @${_user.userName}, ${_user.fullName}, прошел капчу в чате`, chat_link);
            } catch (error) {
                await logMessage('Restrict member error:', error.description);
            }

            // Удаляем сообщение с капчей
            await deleteMessage(ctx, chatId, ctx.callbackQuery.message.message_id, 'correct_answer');
            
            // Очищаем все данные капчи
            await clearCaptchaData(chatId, user.id);

        } else if (allowedChats.includes(chatId) && targetUser) {
            await logMessage(`Пользователь ${user.id}, @${_user.userName}, ${_user.fullName}, НЕ прошел капчу в чате`, chat_link);
            
            await ctx.answerCbQuery('Вам не хватает знаний начальной школы по математике 😎', { 
                show_alert: true, 
                cache_time: 10 
            });

            // Удаляем сообщение с капчей
            await deleteMessage(ctx, chatId, ctx.callbackQuery.message.message_id, 'incorrect_answer');
            
            // Баним пользователя
            await bot.telegram.banChatMember(chatId, user.id);
            
            // Очищаем все данные капчи
            await clearCaptchaData(chatId, user.id);
        }
    } catch (error) {
        console.error('Error при Callback на капчу:', error);
    }
});

// Восстанавливаем таймауты при запуске бота
async function restoreCaptchaTimeouts() {
    try {
        await loadPendingCaptchas();
        const now = Date.now();
        
        for (const [key, captcha] of Object.entries(PendingCaptchas)) {
            const timeElapsed = now - captcha.timestamp;
            const timeRemaining = 60000 - timeElapsed; // 1 минута в миллисекундах
            
            if (timeRemaining > 0) {
                // Если времени еще осталось, устанавливаем таймаут
                const timeoutId = setTimeout(async () => {
                    try {
                        if (PendingCaptchas[key]) {
                            await deleteMessage({ telegram: bot.telegram }, captcha.chatId, captcha.messageId, 'restored_timeout');
                            await bot.telegram.banChatMember(captcha.chatId, captcha.userId);
                            await logMessage(`Пользователь ${captcha.userId} забанен за неответ на капчу в чате ${captcha.chatId} (восстановленный таймаут)`, '');
                            await clearCaptchaData(captcha.chatId, captcha.userId);
                        }
                    } catch (error) {
                        console.error('Error in restored captcha timeout:', error);
                    }
                }, timeRemaining);
                
                // Сохраняем восстановленный таймаут
                CaptchaTimeouts[key] = timeoutId;
            } else {
                // Время уже истекло, сразу баним
                try {
                    await deleteMessage({ telegram: bot.telegram }, captcha.chatId, captcha.messageId, 'expired_timeout');
                    await bot.telegram.banChatMember(captcha.chatId, captcha.userId);
                    await logMessage(`Пользователь ${captcha.userId} забанен за неответ на капчу в чате ${captcha.chatId} (истекший таймаут)`, '');
                    await clearCaptchaData(captcha.chatId, captcha.userId);
                } catch (error) {
                    console.error('Error processing expired captcha:', error);
                }
            }
        }
    } catch (error) {
        console.error('Error restoring captcha timeouts:', error);
    }
}

async function startBot() {
    try {
        await loadAllowedChats();
        await restoreCaptchaTimeouts();
        
        bot.launch({
            allowedUpdates: ["message", 'chat_member', "my_chat_member", "callback_query"]
        });
        
        console.log('Bot is running');
    } catch (error) {
        console.error('BOT START:', error);
    }
}

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

startBot();