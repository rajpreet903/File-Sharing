const multer = require("multer");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const File = require("./models/file");
dotenv.config({ path: './config.env' });
const app = express();
app.use(express.urlencoded({ extended: true }));
const upload = multer({ dest: "uploads" });

//connect to mongodb
const DB = process.env.DATABASE_URL.replace('<password>',process.env.DATABASE_PASSWORD)
mongoose.connect(DB).then(console.log("Successfully connected to Database")).catch((err)=> console.log(err));

//setting the view engine
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/views"));
app.get("/", (req, res) => {
   res.render("index");
});

//uploading the file to db
app.post("/upload", upload.single("file"), async (req, res) => {
   const fileData = {
      path: req.file.path,
      originalName: req.file.originalname,
   };
   if (req.body.password != null && req.body.password != "") {
      fileData.password = await bcrypt.hash(req.body.password, 10);
   }
   const file = await File.create(fileData);

   //generating the file download link
   res.render("index", { fileLink: `${req.headers.origin}/file/${file.id}` });
});

//downloading the file
app.route("/file/:id").get(handlepassword).post(handlepassword);

async function handlepassword(req, res) {
   const file = await File.findById(req.params.id);

   if (file.password != null) {
      if (req.body.password == null) {
         res.render("password");
         return;
      }
      if (!(await bcrypt.compare(req.body.password, file.password))) {
         res.render("password", { error: true });
         return;
      }
   }
   file.downloadCount++;
   await file.save();
   res.download(file.path, file.originalName);
}
app.listen(process.env.PORT || 3000);
