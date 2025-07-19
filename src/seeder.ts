import { DataSource } from 'typeorm';
import { User } from './user/entities/user.entity';
import * as bcrypt from 'bcrypt';

export const seed20Users = async (dataSource: DataSource) => {
  const userRepository = dataSource.getRepository(User);

  const users = Array.from({ length: 20 }).map((_, i) => {
    const index = i + 1;
    return {
      fullName: `User ${index}`,
      email: `user${index}@example.com`,
      password: 'Saqib@12345',
      confirmPassword: 'Saqib@12345',
    };
  });

  for (const user of users) {
    const exists = await userRepository.findOne({
      where: { email: user.email },
    });
    if (exists) {
      console.log(`⚠️ User already exists: ${user.email}`);
      continue;
    }

    if (user.password !== user.confirmPassword) {
      console.warn(`❌ Passwords do not match for ${user.email}, skipping.`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);

    const newUser = userRepository.create({
      fullName: user.fullName,
      email: user.email,
      password: hashedPassword,
    });

    await userRepository.save(newUser);
    console.log(`✅ User seeded: ${user.email}`);
  }

  console.log('🎉 20 users seeded successfully');
};
