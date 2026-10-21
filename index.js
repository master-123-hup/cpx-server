const express = require('express');
const admin = require('firebase-admin');
const app = express();

// ==========================================
// 1. إعدادات Firebase (قراءة المفتاح السري من Render)
// ==========================================
try {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountString) {
        const serviceAccount = JSON.parse(serviceAccountString);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin Initialized Successfully.");
    } else {
        console.log("⚠️ Warning: FIREBASE_SERVICE_ACCOUNT is missing in environment variables.");
    }
} catch (error) {
    console.error("❌ Error initializing Firebase Admin:", error.message);
}

const db = admin.firestore();

// ==========================================
// 2. الإعدادات الأساسية
// ==========================================
const CPX_SECURE_HASH = "fWvtK6ioZmV33LXVpkkHsLV8sBsQcdxx"; 

// ==========================================
// 3. مسارات الخادم (Routes)
// ==========================================

// صفحة رئيسية للتأكد أن الخادم يعمل
app.get('/', (req, res) => {
    res.send("<h1>Postback Server is Running Successfully! 🚀</h1>");
});

// الرابط الذي ستستقبل عليه الإشعارات من CPX
app.get('/postback', async (req, res) => {
    try {
        const { user_id, amount_local, status } = req.query;
        
        console.log(`[إشعار CPX] User: ${user_id}, Amount: ${amount_local}, Status: ${status}`);

        if (!user_id || !amount_local) {
            return res.status(400).send("Missing parameters");
        }

        const pointsToAdd = Math.floor(parseFloat(amount_local) * 50);

        if (pointsToAdd > 0) {
            const userRef = db.collection('users').doc(user_id);
            const doc = await userRef.get();
            
            if (doc.exists) {
                await userRef.update({
                    points: admin.firestore.FieldValue.increment(pointsToAdd)
                });
                console.log(`✅ CPX: تم إضافة ${pointsToAdd} نقطة للمستخدم: ${user_id}`);
            }
        }

        res.status(200).send("OK");

    } catch (error) {
        console.error("❌ خطأ في CPX:", error);
        res.status(500).send("Internal Server Error");
    }
});

// الرابط الذي ستستقبل عليه الإشعارات من CPAGrip
app.get('/cpagrip-postback', async (req, res) => {
    try {
        const secret = "MySuperSecretKey123";
        if (req.query.password !== secret) {
            return res.status(403).send("0");
        }

        const { tracking_id, payout } = req.query;
        
        if (!tracking_id || !payout) {
            return res.status(400).send("0");
        }

        const pointsToAdd = Math.floor(parseFloat(payout) * 50);

        if (pointsToAdd > 0) {
            const userRef = db.collection('users').doc(tracking_id);
            await userRef.update({
                points: admin.firestore.FieldValue.increment(pointsToAdd)
            });
            console.log(`✅ CPAGrip: تم إضافة ${pointsToAdd} نقطة للمستخدم ${tracking_id}`);
        }

        res.status(200).send("1");
    } catch (error) {
        console.error("CPAGrip Postback Error:", error);
        res.status(500).send("0");
    }
});

// ==========================================
// 4. تشغيل الخادم (هذا الجزء يجب أن يكون في النهاية دائماً)
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل بنجاح على المنفذ ${PORT}`);
});