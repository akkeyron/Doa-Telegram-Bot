const AdminId = '5210231902';

export async function broadcast(bot, ctx, admin) {
    if (String(ctx.message.chat.id) !== AdminId) {
        return;
    }

    // get the broadcast message
    const message_broadcast = ctx.message.text.replace(`/${ctx.command}`, '');

    // if message empty
    if (message_broadcast === "") return

    const chatCollection = admin.firestore().collection('Users');

    // Query the Firestore collection to get all ChatId
    const querySnapshot = await chatCollection.get();

    // get all chatIds
    const chatIds = querySnapshot.docs.map(doc => doc.data().chatId);

    await Promise.all(chatIds.map(chatId => {
        bot.telegram.sendMessage(chatId, message_broadcast)
        .catch(error => {
            ctx.reply(String(error) + " ChatID: " + chatId);
        })
    }))

    // querySnapshot.forEach((doc) => {
    //     var chatId = doc.data().chatId;

    //     // broadcast to users
    //     bot.telegram.sendMessage(chatId, message_broadcast)
    //         .catch(error => {
    //             ctx.reply(String(error) + " ChatID: " + chatId);
    //         })
    // })

    return ctx.reply("Message berjaya di broadcast")
}


export async function broadcast_test(bot, ctx) {
    if (String(ctx.message.chat.id) !== AdminId) {
        return;
    }
    // get the broadcast message
    const message_broadcast = ctx.message.text.replace(`/${ctx.command}`, '');

    // if message empty
    if (message_broadcast === "") return

    // broadcast meesage to users
    bot.telegram.sendMessage(AdminId, message_broadcast)
        .catch(error => {
            ctx.reply(String(error) + " ChatID: " + AdminId);
        })


    return ctx.reply("Message berjaya di broadcast")
}