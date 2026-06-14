# Recipe Share Express API

Express API for the Recipe Share app. Recipes are stored in MongoDB and optional photos are uploaded to Cloudinary.

## Run Locally

```bash
npm install
npm run dev
```

The API runs on `http://localhost:4000`.

## Environment

Set these variables locally and in Vercel:

```bash
MONGODB_URI=your_mongodb_connection_string
FRONTEND_ORIGIN=http://localhost:5173,https://your-react-app.vercel.app
CLOUDINARY_URL=your_cloudinary_url
```

`CLOUDINARY_URL` can be replaced by `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.

For Vercel, add these in Project Settings > Environment Variables. Set `FRONTEND_ORIGIN` to your deployed React app URL after it is available.

## API

- `GET /api/recipes`
- `POST /api/recipes`
- `DELETE /api/recipes/:id`

## Seed MongoDB

```bash
npm run db:seed
```
