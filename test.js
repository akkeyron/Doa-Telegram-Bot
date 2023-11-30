import fetch from 'node-fetch';
import { Telegraf, Markup } from 'telegraf';
import 'dotenv/config';
import functions from 'firebase-functions';
import { OutputArab, OutputRumi } from './functions/OutputFormat.js';
const GITHUB = "https://akkeyron.github.io/doa-harian/doa.json";

// Firestore DB initialization
import admin from 'firebase-admin';
import { error } from 'firebase-functions/logger';

import serviceAccount from "./functions/access_key.json" assert { type: "json"}
import { broadcast, broadcast_test } from './functions/broadcast.js';

admin.initializeApp({
    credential:  admin.credential.cert(serviceAccount)
});


const BOT_TOKEN = process.env.BOT_TOKEN
const bot = new Telegraf(BOT_TOKEN, { polling: true });

bot.start((ctx) => {
    const chatId = ctx.message.chat.id;
    // const db = admin.firestore()
    // const userRef = db.collection('Users').doc(chatId.toString());
    // userRef.set({
    //     name: "",
    //     chatId: chatId,
    //     lang: "my"
    // });
    ctx.reply('Assalamualaikum, sila tanya apa sahaja yang anda mahu saya cuba mencari doa yang sesuai untuk anda\n\nataupun klik /doa')
})

bot.hears('Assalamualaikum', (ctx) => ctx.reply('Waalaikumussalam, semoga anda sentiasa dibawah rahmat Allah'))

// broadcast message
bot.command('bdct', async (ctx) => {
    broadcast(bot, ctx, admin);
})

// test broadcast message
bot.command('test', async (ctx) => {
    broadcast_test(bot, ctx);
})

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
                    group_list.map((name) => [Markup.button.callback(name, `show_name_${name}`)])
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
bot.action(/^show_name_(.+)/, (ctx) => {
    const group_name = ctx.match[1];

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
            const matchingRecords = data.filter((record) => record.group === group_name)

            if (matchingRecords.length > 0) {
                const keyboard = Markup.inlineKeyboard(
                    [Markup.button.callback("<<", `test`),
                    Markup.button.callback("1/5", `dummy`),
                    Markup.button.callback(">>", `test`)],
                );


                const resultMessage = matchingRecords.map((record) =>
                    `/bacaan${record.id}\t ${record.doa}`
                ).join('\n\n');

                ctx.reply(`${resultMessage}`,
                    keyboard,
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

// Query command handler
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

// get 
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
})

// respond user query with doa that suitable
bot.on('text', (ctx) => {
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

bot.launch()
console.log('Bot is online');
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

