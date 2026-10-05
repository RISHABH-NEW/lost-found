const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? path.join('/tmp', 'data') : path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const SEED_FILE = path.join(__dirname, '..', 'data', 'db.json');

// Ensure data directory exists safely (guard against EROFS on serverless/read-only systems)
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  // Read-only filesystem (e.g. AWS Lambda / Vercel), fallback to in-memory state
}

// In-memory cache for serverless environments
let memoryStore = null;

// Initial DB state with guaranteed pre-seeded demo users (bcrypt-hashed password123)
const getInitialData = () => ({
  users: [
    {
      _id: '6ac38cc3dfb150bdc41abdf7',
      name: 'Rohan Sharma',
      email: 'rohan@campus.edu',
      password: '$2a$10$4K9tsqewzoM7ecfJMhe/8exi3NpbwbmKdmSU5nmprhpgfjUIdt2MG',
      phone: '+91 9876543210',
      createdAt: '2026-10-05T11:40:51.185Z',
    },
    {
      _id: '6ac38cc4dfb150bdc41abdf8',
      name: 'Priya Sharma',
      email: 'priya.sharma@campus.edu',
      password: '$2a$10$NZVftdMAxYo7wMYbkV6J7urpgPYFFF0LOgwJ.sjy4A/aJMHOayd9K',
      phone: '+91 9812345678',
      createdAt: '2026-10-05T11:40:52.646Z',
    },
    {
      _id: '6ac38cc5dfb150bdc41abdf9',
      name: 'Rahul Verma',
      email: 'rahul.verma@campus.edu',
      password: '$2a$10$3OC6tQkPANUCskCwtI6SLeDyCvDAjZIZolIwVVmaHbg.chfXO9aNK',
      phone: '+91 9988776655',
      createdAt: '2026-10-05T11:40:53.566Z',
    },
  ],
  items: [],
});

const loadData = () => {
  if (memoryStore) {
    return memoryStore;
  }

  // 1. Try reading from DATA_FILE (/tmp/data/db.json on Vercel or backend/data/db.json locally)
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      memoryStore = JSON.parse(content);
      return memoryStore;
    }
  } catch (err) {
    // Continue to seed file fallback
  }

  // 2. Try reading from bundled repository SEED_FILE
  try {
    if (fs.existsSync(SEED_FILE)) {
      const content = fs.readFileSync(SEED_FILE, 'utf-8');
      memoryStore = JSON.parse(content);
      return memoryStore;
    }
  } catch (err) {
    // Continue to initial fallback
  }

  // 3. Fallback to hardcoded seed data with demo users
  memoryStore = getInitialData();
  saveData(memoryStore);
  return memoryStore;
};

const saveData = (data) => {
  memoryStore = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // In read-only serverless environment, data safely persists in memoryStore for the container lifetime
  }
};

// Check if Mongoose has an active live connection to a MongoDB server
const isMongoConnected = () => {
  return mongoose.connection && mongoose.connection.readyState === 1;
};

// --- In-Memory / File-Persisted Fallback Helper ---
const createObjectId = () => new mongoose.Types.ObjectId().toString();

const createUserInstance = (userDoc) => {
  if (!userDoc) return null;
  const instance = { ...userDoc };
  instance._id = instance._id ? instance._id.toString() : createObjectId();
  instance.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  };
  instance.toJSON = function () {
    const copy = { ...this };
    delete copy.password;
    delete copy.matchPassword;
    delete copy.toJSON;
    delete copy.save;
    return copy;
  };
  instance.save = async function () {
    const data = loadData();
    const idx = data.users.findIndex((u) => u._id.toString() === this._id.toString());
    if (idx !== -1) {
      data.users[idx] = { ...this };
      saveData(data);
    }
    return this;
  };
  return instance;
};

const createItemInstance = (itemDoc) => {
  if (!itemDoc) return null;
  const instance = { ...itemDoc };
  instance._id = instance._id ? instance._id.toString() : createObjectId();
  instance.toObject = function () {
    const copy = { ...this };
    delete copy.toObject;
    delete copy.save;
    return copy;
  };
  instance.save = async function () {
    this.updatedAt = new Date();
    const data = loadData();
    const idx = data.items.findIndex((i) => i._id.toString() === this._id.toString());
    if (idx !== -1) {
      data.items[idx] = { ...this };
      saveData(data);
    }
    return this;
  };
  return instance;
};

// Chainable query helper for items
class QueryCursor {
  constructor(itemsPromise) {
    this._promise = Promise.resolve(itemsPromise);
    this._populateField = null;
    this._populateSelect = null;
    this._sortOption = null;
    this._skipCount = 0;
    this._limitCount = null;
    this._isLean = false;
  }

  populate(field, select) {
    this._populateField = field;
    this._populateSelect = select;
    return this;
  }

  sort(sortOption) {
    this._sortOption = sortOption;
    return this;
  }

  skip(count) {
    this._skipCount = count || 0;
    return this;
  }

  limit(count) {
    this._limitCount = count;
    return this;
  }

  lean() {
    this._isLean = true;
    return this;
  }

  async exec() {
    let result = await this._promise;

    // Sort
    if (this._sortOption && Array.isArray(result)) {
      result = [...result].sort((a, b) => {
        if (this._sortOption.createdAt === -1) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        if (this._sortOption.createdAt === 1) {
          return new Date(a.createdAt) - new Date(b.createdAt);
        }
        if (this._sortOption.date === -1) {
          return new Date(b.date) - new Date(a.date);
        }
        if (this._sortOption.date === 1) {
          return new Date(a.date) - new Date(b.date);
        }
        return 0;
      });
    }

    // Skip & Limit
    if (Array.isArray(result)) {
      if (this._skipCount) {
        result = result.slice(this._skipCount);
      }
      if (this._limitCount) {
        result = result.slice(0, this._limitCount);
      }
    }

    // Populate postedBy with User data
    if (this._populateField === 'postedBy') {
      const data = loadData();
      const usersMap = new Map(data.users.map((u) => [u._id.toString(), u]));

      const doPopulate = (item) => {
        if (!item) return item;
        const posterId = item.postedBy ? item.postedBy.toString() : null;
        const user = usersMap.get(posterId);
        if (user) {
          const userObj = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            createdAt: user.createdAt,
          };
          return { ...item, postedBy: userObj };
        }
        return item;
      };

      if (Array.isArray(result)) {
        result = result.map(doPopulate);
      } else if (result) {
        result = doPopulate(result);
      }
    }

    if (this._isLean) {
      return result;
    }

    if (Array.isArray(result)) {
      return result.map(createItemInstance);
    } else if (result) {
      return createItemInstance(result);
    }
    return result;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

// User Model Handler
const UserModel = {
  async create(userFields) {
    if (isMongoConnected()) {
      const UserMongoose = require('./User');
      return await UserMongoose.create(userFields);
    }

    const data = loadData();
    const cleanEmail = userFields.email.toLowerCase().trim();

    if (data.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      const err = new Error('An account with this email already exists. Please log in.');
      err.code = 11000;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userFields.password, salt);

    const newUser = {
      _id: createObjectId(),
      name: userFields.name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      phone: userFields.phone.trim(),
      createdAt: new Date(),
    };

    data.users.push(newUser);
    saveData(data);
    return createUserInstance(newUser);
  },

  async findOne(query) {
    if (isMongoConnected()) {
      const UserMongoose = require('./User');
      return await UserMongoose.findOne(query);
    }

    const data = loadData();
    if (query.email) {
      const cleanEmail = query.email.toLowerCase().trim();
      const user = data.users.find((u) => u.email.toLowerCase() === cleanEmail);
      return user ? createUserInstance(user) : null;
    }
    return null;
  },

  findById(id) {
    if (isMongoConnected()) {
      const UserMongoose = require('./User');
      return UserMongoose.findById(id);
    }

    const data = loadData();
    const user = data.users.find((u) => u._id.toString() === (id ? id.toString() : ''));
    const instance = user ? createUserInstance(user) : null;

    return {
      select(fields) {
        if (!instance) return Promise.resolve(null);
        if (fields.includes('-password')) {
          return Promise.resolve(instance.toJSON());
        }
        return Promise.resolve(instance);
      },
      then(resolve, reject) {
        return Promise.resolve(instance).then(resolve, reject);
      },
      catch(reject) {
        return Promise.resolve(instance).catch(reject);
      },
    };
  },

  async countDocuments(query = {}) {
    if (isMongoConnected()) {
      const UserMongoose = require('./User');
      return await UserMongoose.countDocuments(query);
    }
    const data = loadData();
    return data.users.length;
  },
};

// Item Model Handler
const ItemModel = {
  async create(itemFields) {
    if (isMongoConnected()) {
      const ItemMongoose = require('./Item');
      return await ItemMongoose.create(itemFields);
    }

    const data = loadData();
    const newItem = {
      _id: createObjectId(),
      title: itemFields.title.trim(),
      description: itemFields.description.trim(),
      type: itemFields.type,
      category: itemFields.category.trim(),
      location: itemFields.location.trim(),
      date: itemFields.date ? new Date(itemFields.date) : new Date(),
      imagePath: itemFields.imagePath || null,
      status: itemFields.status || 'Active',
      postedBy: itemFields.postedBy ? itemFields.postedBy.toString() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    data.items.unshift(newItem);
    saveData(data);
    return createItemInstance(newItem);
  },

  find(query = {}) {
    if (isMongoConnected()) {
      const ItemMongoose = require('./Item');
      return ItemMongoose.find(query);
    }

    const data = loadData();
    let filtered = [...data.items];

    if (query.type) {
      filtered = filtered.filter((i) => i.type === query.type);
    }
    if (query.category) {
      filtered = filtered.filter((i) => i.category.toLowerCase() === query.category.toLowerCase());
    }
    if (query.location) {
      filtered = filtered.filter((i) => i.location.toLowerCase() === query.location.toLowerCase());
    }
    if (query.status && query.status !== 'all') {
      filtered = filtered.filter((i) => i.status === query.status);
    }
    if (query.postedBy) {
      filtered = filtered.filter(
        (i) => i.postedBy && i.postedBy.toString() === query.postedBy.toString()
      );
    }
    if (query.$or && Array.isArray(query.$or)) {
      // Keyword search regex
      filtered = filtered.filter((item) => {
        return query.$or.some((clause) => {
          const field = Object.keys(clause)[0];
          const regex = clause[field];
          const val = item[field];
          return val && typeof val === 'string' && regex.test(val);
        });
      });
    }

    return new QueryCursor(filtered);
  },

  findById(id) {
    if (isMongoConnected()) {
      const ItemMongoose = require('./Item');
      return ItemMongoose.findById(id);
    }

    const data = loadData();
    const item = data.items.find((i) => i._id.toString() === (id ? id.toString() : ''));
    return new QueryCursor(item || null);
  },

  async findByIdAndDelete(id) {
    if (isMongoConnected()) {
      const ItemMongoose = require('./Item');
      return await ItemMongoose.findByIdAndDelete(id);
    }

    const data = loadData();
    const idx = data.items.findIndex((i) => i._id.toString() === (id ? id.toString() : ''));
    if (idx !== -1) {
      const deleted = data.items.splice(idx, 1)[0];
      saveData(data);
      return deleted;
    }
    return null;
  },

  async countDocuments(query = {}) {
    if (isMongoConnected()) {
      const ItemMongoose = require('./Item');
      return await ItemMongoose.countDocuments(query);
    }

    const data = loadData();
    let count = data.items.length;
    if (query.type) count = data.items.filter((i) => i.type === query.type).length;
    if (query.status) count = data.items.filter((i) => i.status === query.status).length;
    return count;
  },
};

module.exports = {
  User: UserModel,
  Item: ItemModel,
  isMongoConnected,
};
