const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 40, fieldSize: 400 * 1024 },
    fileFilter(req, file, cb) {
        if (IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
        const err = new Error('Images must be JPEG, PNG, WebP or AVIF files.');
        err.status = 400;
        cb(err);
    }
});

// Multer errors are the client's fault (too big, wrong type), so answer 400.
const answerErrors = (middleware) => (req, res, next) => middleware(req, res, (err) => {
    if (!err) return next();
    const error = err.code === 'LIMIT_FILE_SIZE' ? 'Images must be 5 MB or smaller.' : err.message;
    res.status(err instanceof multer.MulterError || err.status === 400 ? 400 : 500).json({ error });
});

const singleImage = (field) => answerErrors(upload.single(field));
// Multipart text fields only; JSON requests pass straight through.
const formFields = () => answerErrors(upload.none());

const slugify = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 60);

// Descriptive file names help image search, so the Cloudinary id comes from the
// alt text. Without one it falls back to e.g. "blog-image" for annas-kitchen/blogs.
async function uploadImage(file, name, folder) {
    const fallback = `${path.posix.basename(folder).replace(/s$/, '')}-image`;
    const dataURI = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataURI, {
        folder,
        public_id: `${slugify(name) || fallback}-${crypto.randomBytes(3).toString('hex')}`
    });
    return { url: result.secure_url, width: result.width, height: result.height };
}

module.exports = { singleImage, formFields, uploadImage, IMAGE_TYPES };
