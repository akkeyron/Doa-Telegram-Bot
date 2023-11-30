import { Timestamp } from "firebase-admin/firestore";

const AdminId = '5210231902';

export async function setFeedback(bot, ctx, admin) {

    // query database based on userId
    try {
        // get userID
        const userID = ctx.message.chat.id;

        // query
        const userCollection = admin.firestore().collection('Users');
        console.log(Timestamp.now() + " Get database");
        const userDoc = await userCollection.doc(String(userID)).get();
        console.log(Timestamp.now() + " Get specific user record")

        if (userDoc.exists) {
            await userDoc.ref.update({
                setName: true
            });
            console.log(Timestamp.now() + " Update successful");

            return ctx.reply("Sila tulis feedback anda dalam satu message sahaja")
        } else {
            return ctx.reply("Saya tidak jumpa data anda dalam system. Sila klik /start and cuba beri feedback semula")
        }

    }
    catch (error) {
        bot.telegram.sendMessage(AdminId, String(error));
        ctx.reply("Error di dalam system. Tunggu sebentar saya contact tuan saya")
    }
}

export async function getFeedback(bot, ctx, admin) {
    // hantar feedback kepada admin
    bot.telegram.sendMessage(AdminId, `FEEDBACK: ${ctx.message.text}`);

    // query database based on userId
    try {
        // get userID
        const userID = ctx.message.chat.id;

        // query
        const userCollection = admin.firestore().collection('Users');
        const userDoc = await userCollection.doc(String(userID)).get();

        if (userDoc.exists) {
            await userDoc.ref.update({
                setName: false
            });

            return ctx.reply("Feedback anda sudah diterima, terima kasih");
        } else {
            return ctx.reply("Saya tidak jumpa data anda dalam system. Sila klik /start and cuba beri feedback semula")
        }

    }
    catch (error) {
        bot.telegram.sendMessage(AdminId, String(error));
        ctx.reply("Error di dalam system. Tunggu sebentar saya contact tuan saya")
    }
}