import express from 'express';
import cors from 'cors';
import { oijRouter } from './routes/oij.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/security', oijRouter);

app.listen(PORT, () => {
  console.log(`Servidor interno corriendo en el puerto ${PORT}`);
});
