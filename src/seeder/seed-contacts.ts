import { AppDataSource } from '../data-source';
import { User } from '../user/entities/user.entity';
import { Contact } from '../contact/entities/contact.entity';
import { faker } from '@faker-js/faker';

const seedContacts = async () => {
  await AppDataSource.initialize();
  console.log('🔌 Database connected');

  const userRepo = AppDataSource.getRepository(User);
  const contactRepo = AppDataSource.getRepository(Contact);

  const args = process.argv.slice(2);
  const selectedEmails = args.length > 0 ? args : null;

  const users = selectedEmails
    ? await userRepo.find({
        where: selectedEmails.map((email) => ({ email })),
        relations: [],
        withDeleted: false,
      })
    : await userRepo.find({ relations: [], withDeleted: false });

  if (users.length < 2) {
    console.warn('⚠️ Need at least 2 users to seed contacts');
    process.exit(1);
  }

  // ✅ Patch phone numbers for users missing them
  let updatedUsers = 0;
  for (const user of users) {
    if (!user.phone || user.phone.trim() === '') {
      user.phone = `+92 3${faker.string.numeric(2)} ${faker.string.numeric(7)}`;

      await userRepo.save(user);
      updatedUsers++;
    }
  }

  if (updatedUsers > 0) {
    console.log(`📱 Added phone numbers to ${updatedUsers} users`);
  }

  console.log(`👥 Found ${users.length} users to seed contacts`);

  const existingContacts = await contactRepo.find({
    relations: ['owner', 'contactUser'],
  });

  if (existingContacts.length > 0) {
    console.log(`📋 Existing contacts: ${existingContacts.length}`);
    existingContacts.forEach((c, i) => {
      console.log(`${i + 1}. ${c.owner?.email} → ${c.contactUser?.email}`);
    });
  }

  let seededCount = 0;

  for (const owner of users) {
    const contactCandidates = users.filter((u) => u.id !== owner.id);
    const shuffled = contactCandidates.sort(() => 0.5 - Math.random());
    const contactsToSeed = shuffled.slice(0, 2); // 2 random contacts

    for (const contactUser of contactsToSeed) {
      const exists = await contactRepo.findOne({
        where: {
          owner: { id: owner.id },
          contactUser: { id: contactUser.id },
        },
      });

      if (exists) {
        console.log(`⚠️ Already exists: ${owner.email} → ${contactUser.email}`);
        continue;
      }

      const newContact = contactRepo.create({ owner, contactUser });
      await contactRepo.save(newContact);

      console.log(`✅ Created: ${owner.email} → ${contactUser.email}`);
      seededCount++;
    }
  }

  console.log(`\n🎉 Seeded ${seededCount} new contacts`);
  process.exit(0);
};

seedContacts().catch((err) => {
  console.error('❌ Failed to seed contacts:', err);
  process.exit(1);
});
