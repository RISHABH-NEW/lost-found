const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { connectDB } = require('./config/db');
const { User, Item } = require('./models');

const seedData = async () => {
  try {
    await connectDB();
    console.log('Seeding demo campus users and items...');

    // Demo Users
    const user1 = await User.create({
      name: 'Rohan Sharma',
      email: 'rohan@campus.edu',
      password: 'password123',
      phone: '+91 9876543210',
    }).catch(async () => await User.findOne({ email: 'rohan@campus.edu' }));

    const user2 = await User.create({
      name: 'Priya Sharma',
      email: 'priya.sharma@campus.edu',
      password: 'password123',
      phone: '+91 9812345678',
    }).catch(async () => await User.findOne({ email: 'priya.sharma@campus.edu' }));

    const user3 = await User.create({
      name: 'Rahul Verma',
      email: 'rahul.verma@campus.edu',
      password: 'password123',
      phone: '+91 9988776655',
    }).catch(async () => await User.findOne({ email: 'rahul.verma@campus.edu' }));

    const existingCount = await Item.countDocuments();
    if (existingCount === 0) {
      await Item.create({
        title: 'College ID Card & Metro Pass',
        description: 'Lost a blue lanyard with Student ID Card (Roll #22BCS104) and Delhi Metro Smart Card inside a transparent sleeve.',
        type: 'Lost',
        category: 'Documents & IDs',
        location: 'Central Library',
        date: new Date(Date.now() - 24 * 3600 * 1000 * 2),
        status: 'Active',
        postedBy: user1._id,
      });

      await Item.create({
        title: 'Casio FX-991EX Scientific Calculator',
        description: 'Found a black Casio ClassWiz FX-991EX calculator on desk 14 after the afternoon physics lab session. Kept safely with lab assistant.',
        type: 'Found',
        category: 'Electronics',
        location: 'Computer Lab 2',
        date: new Date(Date.now() - 24 * 3600 * 1000 * 1),
        status: 'Active',
        postedBy: user2._id,
      });

      await Item.create({
        title: 'Milton 750ml Stainless Steel Bottle (Matte Blue)',
        description: 'Found near the juice counter in the main canteen. Has a small sticker of Naruto on the cap.',
        type: 'Found',
        category: 'Water Bottles',
        location: 'Main Canteen',
        date: new Date(Date.now() - 24 * 3600 * 1000 * 3),
        status: 'Active',
        postedBy: user3._id,
      });

      await Item.create({
        title: 'Dell 65W Type-C Laptop Charger',
        description: 'Left my black Dell 65W USB-C charger plugged into the wall socket near row 3 in lecture hall 204.',
        type: 'Lost',
        category: 'Electronics',
        location: 'Academic Block 1',
        date: new Date(Date.now() - 24 * 3600 * 1000 * 4),
        status: 'Active',
        postedBy: user1._id,
      });

      await Item.create({
        title: 'Set of 3 Bike Keys with Red Honda Lanyard',
        description: 'Found near the two-wheeler parking lot right beside the campus main entrance gate. Deposited at Security Guard Post 1.',
        type: 'Found',
        category: 'Keys & Wallets',
        location: 'Campus Main Gate',
        date: new Date(Date.now() - 24 * 3600 * 1000 * 1),
        status: 'Active',
        postedBy: user2._id,
      });

      await Item.create({
        title: 'Wildcraft Grey College Backpack',
        description: 'Found in the auditorium during orientation. Contains notebooks and geometry box. Owner claimed and verified ID successfully.',
        type: 'Found',
        category: 'Bags & Backpacks',
        location: 'Main Auditorium',
        date: new Date(Date.now() - 24 * 3600 * 1000 * 6),
        status: 'Resolved',
        postedBy: user3._id,
      });

      console.log('Seeded 6 sample campus items successfully.');
    } else {
      console.log(` Database already contains ${existingCount} items. Skipping initial items seed.`);
    }

    console.log(' Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed Error:', err);
    process.exit(1);
  }
};

seedData();
