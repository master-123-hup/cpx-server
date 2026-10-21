const express = require('express');
const admin = require('firebase-admin');
const app = express();

// ==========================================
// 1. إعدادات Firebase (قراءة المفتاح السري من Render)
// ==========================================
// تأكد أنك أضفت المتغير FIREBASE_SERVICE_ACCOUNT في إعدادات Render
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
// ⚠️ ضع هنا الـ Security Hash الخاص بك (الذي يبدأ بـ fWvK...)
const CPX_SECURE_HASH = "fWvtK6ioZmV33LXVpkkHsLV8sBsQcdxx"; 

// ==========================================
// 3. مسارات الخادم (Routes)
// ==========================================

// صفحة رئيسية للتأكد أن الخادم يعمل
app.get('/', (req, res) => {
    res.send("<h1>CPX Postback Server is Running Successfully! 🚀</h1>");
});

// الرابط الذي ستستقبل عليه الإشعارات من CPX
app.get('/postback', async (req, res) => {
    try {
        // جلب البيانات من رابط CPX
        const { user_id, amount_local, status, hash, trans_id } = req.query;
        
        console.log(`[إشعار جديد] User: ${user_id}, Amount: ${amount_local}, Status: ${status}`);

        // التحقق من وجود البيانات الأساسية
        if (!user_id || !amount_local) {
            console.log("❌ بيانات ناقصة في الطلب.");
            return res.status(400).send("Missing parameters");
        }

        // التحقق من الحماية (اختياري: يمكنك تفعيله لاحقاً إذا أردت)
        // if (hash !== CPX_SECURE_HASH) {
        //     console.log("❌ توقيع غير صالح.");
        //     return res.status(403).send("Invalid Signature");
        // }

        // تحويل المبلغ (بالدولار) إلى نقاط
        // المعادلة: 1 دولار = 50 نقطة
        const pointsToAdd = Math.floor(parseFloat(amount_local) * 50);

        // إضافة النقاط في قاعدة بيانات Firebase
        if (pointsToAdd > 0) {
            const userRef = db.collection('users').doc(user_id);
            
            // التحقق من أن المستخدم موجود
            const doc = await userRef.get();
            
            if (doc.exists) {
                await userRef.update({
                    points: admin.firestore.FieldValue.increment(pointsToAdd)
                });
                console.log(`✅ تم إضافة ${pointsToAdd} نقطة للمستخدم: ${user_id}`);
            } else {
                console.log(`❌ المستخدم غير موجود في Firebase: ${user_id}`);
            }
        }

        // إرسال رد نجاح إلى CPX
        res.status(200).send("OK");

    } catch (error) {
        console.error("❌ حدث خطأ أثناء معالجة الإشعار:", error);
        res.status(500).send("Internal Server Error");
    }
});

// ==========================================
// 4. تشغيل الخادم
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل بنجاح على المنفذ ${PORT}`);
});