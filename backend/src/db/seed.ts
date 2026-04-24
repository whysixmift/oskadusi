import 'dotenv/config';
import { runMigrations, seedAdmin, seedSamplePosts } from './schema';

console.log('Running database migrations and seeding...');
runMigrations();
seedAdmin();
seedSamplePosts();
console.log('Done!');
process.exit(0);
