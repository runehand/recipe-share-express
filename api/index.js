import cors from 'cors';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { MongoClient } from 'mongodb';
import multer from 'multer';

const databaseName = 'recipe-share';
const collectionName = 'recipes';
const allowedOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }

    cb(new Error('Only image uploads are supported.'));
  }
});

const hasCloudinaryConfig = Boolean(
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);

if (hasCloudinaryConfig && !process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

let mongoClientPromise;

function getCorsOrigin(origin, callback) {
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error('Not allowed by CORS.'));
}

async function getMongoClient() {
  if (!process.env.MONGODB_URI) {
    const error = new Error('MONGODB_URI is not configured.');
    error.statusCode = 500;
    throw error;
  }

  if (!mongoClientPromise) {
    mongoClientPromise = new MongoClient(process.env.MONGODB_URI).connect();
  }

  return mongoClientPromise;
}

async function getRecipesCollection() {
  const client = await getMongoClient();
  return client.db(databaseName).collection(collectionName);
}

function serializeRecipe(recipe) {
  const { _id, ...serialized } = recipe;
  return serialized;
}

async function storePhoto(file) {
  if (!file) {
    return { photoUrl: '', photoPublicId: '' };
  }

  if (!hasCloudinaryConfig) {
    const error = new Error('Cloudinary photo storage is not configured. Set CLOUDINARY_URL or Cloudinary API credentials.');
    error.statusCode = 503;
    throw error;
  }

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'recipe-share',
        resource_type: 'image'
      },
      (error, uploadResult) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(uploadResult);
      }
    );

    stream.end(file.buffer);
  });

  return {
    photoUrl: result.secure_url,
    photoPublicId: result.public_id
  };
}

async function deletePhoto(recipe) {
  if (recipe.photoPublicId && hasCloudinaryConfig) {
    await cloudinary.uploader.destroy(recipe.photoPublicId, { resource_type: 'image' });
  }
}

app.use(cors({ origin: getCorsOrigin }));
app.options(/.*/, cors({ origin: getCorsOrigin }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'recipe-share-express' });
});

app.get('/api/recipes', async (_req, res, next) => {
  try {
    const collection = await getRecipesCollection();
    const recipes = await collection.find({}).sort({ createdAt: -1 }).toArray();
    res.json(recipes.map(serializeRecipe));
  } catch (error) {
    next(error);
  }
});

app.post('/api/recipes', upload.single('photo'), async (req, res, next) => {
  try {
    const title = req.body.title?.trim();
    const ingredients = req.body.ingredients?.trim();
    const instructions = req.body.instructions?.trim();

    if (!title || !ingredients || !instructions) {
      res.status(400).json({ message: 'Title, ingredients, and instructions are required.' });
      return;
    }

    const photo = await storePhoto(req.file);
    const recipe = {
      id: randomUUID(),
      title,
      ingredients,
      instructions,
      photoUrl: photo.photoUrl,
      photoPublicId: photo.photoPublicId,
      createdAt: new Date().toISOString()
    };

    const collection = await getRecipesCollection();
    await collection.insertOne(recipe);
    res.status(201).json(recipe);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/recipes/:id', async (req, res, next) => {
  try {
    const collection = await getRecipesCollection();
    const recipe = await collection.findOne({ id: req.params.id });

    if (!recipe) {
      res.status(404).json({ message: 'Recipe not found.' });
      return;
    }

    await deletePhoto(recipe);
    await collection.deleteOne({ id: req.params.id });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.statusCode || 500).json({ message: error.message || 'Unexpected server error.' });
});

export default app;
