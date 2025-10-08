const app = require('./src/app');
const dotenv = require('dotenv');
const connectDB = require('./src/db/db');
dotenv.config();

connectDB();
console.log("hello");
app.listen(process.env.PORT || 5000, () => {
    console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
});