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
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

You can also use `CLOUDINARY_URL` instead of the three separate Cloudinary variables.

For Vercel, add these in Project Settings > Environment Variables. Set `FRONTEND_ORIGIN` to your deployed React app URL after it is available.

## API

- `GET /api/recipes`
- `POST /api/recipes`
- `DELETE /api/recipes/:id`

## Seed MongoDB

```bash
npm run db:seed
```
