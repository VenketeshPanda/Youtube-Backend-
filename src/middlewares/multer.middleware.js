import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname) //We store the names given by the user, since we are going to have it for
    }                             //sometime only then it will be saved in the cloudinary
  })
  
  export const upload = multer({ storage }) 