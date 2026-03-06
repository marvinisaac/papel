import path from 'path';

export const PORT = process.env.PORT || 3000;
export const DATA_DIR = process.env.DATA_DIR || '/data';
export const API_TOKEN = process.env.API_TOKEN || 'dev-token';
export const SALT_FILE = path.join(DATA_DIR, 'salt.json');

