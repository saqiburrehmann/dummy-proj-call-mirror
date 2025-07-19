import { AppDataSource } from '../data-source';
import { seed20Users } from '../seeder';

AppDataSource.initialize()
  .then(async () => {
    console.log('🔌 DB connected');
    await seed20Users(AppDataSource);
    console.log('🌱 Seeder complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seeder failed:', err);
    process.exit(1);
  });
