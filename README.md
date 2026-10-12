# FIZIKA SHOW — QR orqali jonli viktorina

Ushbu boshlang‘ich loyiha quyidagilarni o‘z ichiga oladi:
- O‘qituvchi uchun boshqaruv paneli va QR-kod
- 30 tagacha ishtirokchi
- Har savolga 10 soniya
- Tez va to‘g‘ri javob uchun 1000 ballgacha; noto‘g‘ri javob uchun 0 ball
- Har savoldan keyin natija va jonli reyting
- Amper kuchi va magnit xossalari bo‘yicha namunaviy nazariy savollar

## 1. Kompyuterda ishga tushirish (Windows)
1. Node.js 18 yoki undan yangisini https://nodejs.org/ saytidan o‘rnating.
2. Ushbu papkani oching.
3. Papka ichida File Explorer manzil qatoriga `cmd` yozib Enter bosing.
4. Quyidagi buyruqlarni ketma-ket yozing:

```bat
npm install
npm start
```

5. Brauzerda `http://localhost:3000` manzilini oching.

**Eslatma:** localhost faqat shu kompyuterda ochiladi. Boshqa shahardagi yoki boshqa internet tarmog‘idagi telefonlar ulanishi uchun loyihani internetdagi Node.js hostingga joylashtirish kerak.

## 2. Internetga joylashtirish (Render misoli)
1. Loyihani GitHub repozitoriyga yuklang.
2. https://render.com/ saytida yangi **Web Service** yarating va repozitoriyani ulang.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Deploy tugagach, Render bergan `https://...onrender.com` manzilini oching. QR-kod shu ommaviy manzil asosida hosil bo‘ladi.

## Muhim texnik eslatma
Bu birinchi MVP versiyasi. O‘yin xonalari va ballar server xotirasida saqlanadi; server qayta ishga tushsa, o‘yin holati yo‘qoladi. Darsdan oldin turli telefonlarda sinab ko‘ring. Keyingi bosqichda qayta ulanishni mustahkamlash, xona yopish, savollarni tahrirlash va o‘qituvchi parolini qo‘shish mumkin.
