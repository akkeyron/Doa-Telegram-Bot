import fetch from 'node-fetch';
import { Telegraf, Markup } from 'telegraf';
import 'dotenv/config';
import functions from 'firebase-functions/v1';
import { OutputArab, OutputRumi } from './OutputFormat.js';
import { broadcast, broadcast_test } from './broadcast.js';
const GITHUB = "https://akkeyron.github.io/doa-harian/doa.json";

// Firestore DB initialization
import admin from 'firebase-admin';
import { pagination } from './pagination.js';
import { getFeedback, setFeedback } from './feedback.js';

// Initialize Firebase Admin SDK
admin.initializeApp();
const BOT_TOKEN = Object.keys(functions.config()).length ? functions.config().service.bot_token : process.env.BOT_TOKEN

// Initialize your Telegram bot with your bot token
const bot = new Telegraf(BOT_TOKEN, {
    telegram: {
        webhookReply: true
    },
});

// max record per page
const MAX_RECORD_PER_PAGE = 5;

bot.start((ctx) => {
    const chatId = ctx.message.chat.id;
    const db = admin.firestore()
    const userRef = db.collection('Users').doc(chatId.toString());
    userRef.set({
        name: "",
        chatId: chatId,
        lang: "my",
        setName: false
    });
    ctx.reply('Assalamualaikum, sila tanya apa sahaja yang anda mahu saya cuba mencari doa yang sesuai untuk anda\n\nataupun klik /doa')
});

// broadcast message
bot.command('bdct', async (ctx) => {
    broadcast(bot, ctx, admin);
})

// test broadcast message
bot.command('test', async (ctx) => {
    broadcast_test(bot, ctx);
})

bot.hears('Assalamualaikum', (ctx) => ctx.reply('Waalaikumussalam, semoga anda sentiasa dibawah rahmat Allah'))

bot.command('doa', (ctx) => {
    fetch(GITHUB)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                ctx.reply('Failed to fetch JSON data from GitHub.');
                functions.logger.error(response.status);
                throw new Error(`Failed to fetch JSON data from GitHub. Status: ${response.status}`);
            }
        })
        .then(data => {
            // Handle the JSON data here
            const set_doa = new Set();
            data.forEach((record) => set_doa.add(record.group));

            // Convert the Set back to an array
            const group_list = Array.from(set_doa);

            if (group_list.length > 0) {
                // Create an inline keyboard with one column
                const keyboard = Markup.inlineKeyboard(
                    group_list.map((name) => [Markup.button.callback(name, `show_name_${name}_1`)])
                );

                ctx.reply(`Klik dibawah untuk pilih kategori bacaan`, keyboard);
            } else {
                ctx.reply('Cant connect to DB');
            }
        })
        .catch(error => {
            functions.logger.error(error);
            ctx.reply("Ada error berlaku dalam system");
        });
});

bot.action('dummy', () => {
    return;
})

// Handle inline keyboard button presses
bot.action(/^show_name_(.+)_(\d+)/, async (ctx) => {
    const group_name = ctx.match[1];
    const current_page = parseInt(ctx.match[2]);

    fetch(GITHUB)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                ctx.reply('Failed to fetch JSON data from GitHub.');
                functions.logger.error(response.status);
                throw new Error(`Failed to fetch JSON data from GitHub. Status: ${response.status}`);
            }
        })
        .then(data => {
            // get all records then paginate them
            const Records = data.filter((record) => record.group === group_name);
            const matchingRecords = pagination(Records, current_page, MAX_RECORD_PER_PAGE);

            // get max page
            const Max_Page = Math.ceil(Records.length / MAX_RECORD_PER_PAGE);

            if (matchingRecords.length > 0) {
                const keyboard = Markup.inlineKeyboard(
                    [Markup.button.callback("<<", `show_name_${group_name}_${current_page === 1 ? Max_Page : current_page - 1}`),
                    Markup.button.callback(`${current_page}/${Max_Page}`, "dummy"),
                    Markup.button.callback(">>", `show_name_${group_name}_${current_page === Max_Page ? 1 : current_page + 1}`)],
                );

                const resultMessage = matchingRecords.map((record) =>
                    `/bacaan${record.id}\t ${record.doa}`
                ).join('\n\n');

                ctx.editMessageText(`${resultMessage}`, keyboard);
            } else {
                ctx.reply('Maaf, doa tak jumpa.');
            }
        })
        .catch(error => {
            functions.logger.error(error);
            ctx.reply("Ada error berlaku dalam system");
        });
});

// get particular bacaan
bot.hears(/\/bacaan(\d+)/, (ctx) => {
    const recordId = ctx.match[1];

    fetch(GITHUB)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                ctx.reply(`${response.status}`);
                functions.logger.error(response.status);
                throw new Error(`Failed to fetch JSON data from GitHub. Status: ${response.status}`);
            }
        })
        .then(data => {
            // Handle the JSON data here
            const record = data.find((r) => r.id === parseInt(recordId));
            if (record) {
                const Output = OutputArab(record);
                ctx.replyWithHTML(
                    Output,
                    Markup.inlineKeyboard([
                        Markup.button.callback('Rumi', `Recordrumi${record.id}`)
                    ]),
                );
            } else {
                ctx.reply('Maaf, doa tak jumpa.');
            }
        })
        .catch(error => {
            functions.logger.error(error);
            ctx.reply("Ada error berlaku dalam system");
        });
});

// change between arab or rumi 
bot.action(/Record([a-z]+)(\d+)/, async (ctx) => {
    const command = ctx.match[1];
    const id = ctx.match[2];
    await ctx.answerCbQuery();

    fetch(GITHUB)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                ctx.reply(`${response.status}`);
                functions.logger.error(response.status);
                throw new Error(`Failed to fetch JSON data from GitHub. Status: ${response.status}`);
            }
        })
        .then(async data => {
            // Handle the JSON data here
            const record = data.find((r) => r.id === parseInt(id));
            if (record) {
                const Output = command === 'arab' ? OutputArab(record) : OutputRumi(record);
                await ctx.editMessageText(Output,
                    {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [command === 'arab' ? { text: "Rumi", callback_data: `Recordrumi${record.id}` } : { text: "Arab", callback_data: `Recordarab${record.id}` }]
                            ]
                        }
                    }
                );
            } else {
                ctx.reply('Maaf, doa tak jumpa.');
            }
        })
        .catch(error => {
            functions.logger.error(error);
            ctx.reply("Ada error berlaku dalam system");
        });
});

// feedback command
bot.command('feedback', async (ctx) => {
    setFeedback(bot, ctx, admin);
})

// respond user query with doa that suitable
bot.on('text', async (ctx) => {
    // when receive feedback
    const userCollection = admin.firestore().collection('Users');
    const userDoc = await userCollection.doc(String(ctx.message.chat.id)).get();
    if (userDoc.data().setName === true) {
        return getFeedback(bot, ctx, admin);
    }


    // query on doa
    const searchTerm = ctx.message.text;
    const Terms = searchTerm.toLowerCase().split(' ');

    fetch(GITHUB)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                ctx.reply('Failed to fetch JSON data from GitHub.');
                functions.logger.error(response.status);
                throw new Error(`Failed to fetch JSON data from GitHub. Status: ${response.status}`);
            }
        })
        .then(data => {
            // Handle the JSON data here
            const matchingRecords = data.filter((record) =>
                Terms.some((term) => record.tag.some((keyword) => keyword.toLowerCase() === term))
            );
            if (matchingRecords.length > 0) {
                const resultMessage = matchingRecords.map((record) =>
                    `/bacaan${record.id}\t ${record.doa}`
                ).join('\n\n');

                ctx.reply(`${resultMessage}`);
            } else {
                ctx.reply('Maaf, doa tak jumpa.');
            }
        })
        .catch(error => {
            functions.logger.error(error);
            ctx.reply("Ada error berlaku dalam system");
        });

});

bot.catch(error => {
    functions.logger.log(error);
});

// Set up the Firebase Function for Telegram updates
export const botWebhook = functions
.region("asia-southeast1")
.https.onRequest(async (req, res) => {
    functions.logger.log(req.body.message);
    return await bot.handleUpdate(req.body, res);
})