// Data Models and Database Schemas
import mongoose from 'mongoose';

// User Schema
export interface User extends mongoose.Document {
  id: string;
  name: string;
  email: string;
  mobile: string;
  password: string;
  balance: number;
  referralCode: string;
  referredBy?: string;
  joinDate: Date;
  lastLogin: Date;
  status: 'active' | 'suspended' | 'banned';
  statusReason?: string;
  profile: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    dateOfBirth: Date | null;
    gender: string;
    profilePicture: string;
  };
  referredUsers: string[]; // IDs of users referred by this user
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string; // Admin ID if updated by admin
}

export const UserSchema = new mongoose.Schema<User>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  mobile: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 100, min: 0 },
  referralCode: { type: String, required: true, unique: true },
  referredBy: { type: String, default: null },
  joinDate: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['active', 'suspended', 'banned'], 
    default: 'active' 
  },
  statusReason: { type: String, default: null },
  profile: {
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    country: { type: String, default: 'India' },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, default: '' },
    profilePicture: { type: String, default: '' }
  },
  referredUsers: [{ type: String, default: [] }],
  updatedBy: { type: String, default: null }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      delete ret.password;
      return ret;
    }
  }
});

// Transaction Schema
export interface Transaction extends mongoose.Document {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'withdraw';
  method: 'upi' | 'bank' | 'wallet' | 'card';
  status: 'pending' | 'processing' | 'success' | 'failed';
  referenceId?: string; // Gateway reference ID
  paymentDetails: any; // Method-specific details
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

export const TransactionSchema = new mongoose.Schema<Transaction>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, ref: 'User' },
  amount: { type: Number, required: true, min: 1 },
  type: { 
    type: String, 
    enum: ['deposit', 'withdraw'], 
    required: true 
  },
  method: { 
    type: String, 
    enum: ['upi', 'bank', 'wallet', 'card'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'success', 'failed'], 
    default: 'pending' 
  },
  referenceId: { type: String, default: null },
  paymentDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
  error: { type: String, default: null }
}, {
  timestamps: true
});

// Game History Schema
export interface GameHistory extends mongoose.Document {
  id: string;
  userId: string;
  gameId: string;
  round: number;
  betAmount: number;
  betSide: 'andar' | 'bahar';
  result: 'win' | 'loss';
  payout: number;
  openingCard: any;
  winningCard: any;
  gameTimestamp: Date;
  createdAt: Date;
}

export const GameHistorySchema = new mongoose.Schema<GameHistory>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, ref: 'User' },
  gameId: { type: String, required: true },
  round: { type: Number, required: true, min: 1 },
  betAmount: { type: Number, required: true, min: 1 },
  betSide: { 
    type: String, 
    enum: ['andar', 'bahar'], 
    required: true 
  },
  result: { 
    type: String, 
    enum: ['win', 'loss'], 
    required: true 
  },
  payout: { type: Number, required: true, min: 0 },
  openingCard: { type: mongoose.Schema.Types.Mixed, default: {} },
  winningCard: { type: mongoose.Schema.Types.Mixed, default: {} },
  gameTimestamp: { type: Date, required: true }
}, {
  timestamps: true
});

// Site Content Schema
export interface SiteContent extends mongoose.Document {
  whatsappNumber: string;
  siteTitle: string;
  siteSubtitle: string;
  heroTitle: string;
  heroDescription: string;
  aboutContent: string;
  contactInfo: {
    phone?: string;
    email?: string;
    address?: string;
  };
  gameRules: string;
  terms: string;
  privacyPolicy: string;
  
  // System settings
  maintenanceMode: boolean;
  maintenanceMessage: string;
  depositBonus: number; // Percentage
  referralCommission: number; // Percentage
  backupFrequency: string; // 'daily', 'weekly', 'monthly'
  whatsappBusinessAPI: string;
  
  updatedBy?: string; // Admin ID
  updatedAt: Date;
  createdAt: Date;
}

export const SiteContentSchema = new mongoose.Schema<SiteContent>({
  whatsappNumber: { type: String, default: '+91 8686886632' },
  siteTitle: { type: String, default: 'Andar Bahar Game' },
  siteSubtitle: { type: String, default: 'Play and Win Real Money' },
  heroTitle: { type: String, default: 'Welcome to Andar Bahar' },
  heroDescription: { type: String, default: 'Experience the thrill of traditional Indian card game' },
  aboutContent: { type: String, default: 'About our platform' },
  contactInfo: {
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' }
  },
  gameRules: { type: String, default: 'Game rules will be displayed here' },
  terms: { type: String, default: 'Terms and conditions' },
  privacyPolicy: { type: String, default: 'Privacy policy' },
  
  // System settings
  maintenanceMode: { type: Boolean, default: false },
  maintenanceMessage: { type: String, default: 'Site under maintenance' },
  depositBonus: { type: Number, default: 0, min: 0, max: 100 },
  referralCommission: { type: Number, default: 0, min: 0, max: 100 },
  backupFrequency: { 
    type: String, 
    enum: ['daily', 'weekly', 'monthly'], 
    default: 'daily' 
  },
  whatsappBusinessAPI: { type: String, default: '' },
  updatedBy: { type: String, default: null }
}, {
  timestamps: true
});

// Admin Schema
export interface Admin extends mongoose.Document {
  id: string;
  name: string;
  email: string;
  mobile: string;
  password: string;
  role: 'admin' | 'superadmin';
  permissions: string[];
  lastLogin: Date;
  status: 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export const AdminSchema = new mongoose.Schema<Admin>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  mobile: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'superadmin'], 
    default: 'admin' 
  },
  permissions: [{ type: String, default: [] }],
  lastLogin: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['active', 'suspended'], 
    default: 'active' 
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      delete ret.password;
      return ret;
    }
  }
});

// Game State Schema (for real-time game management)
export interface GameState extends mongoose.Document {
  id: string;
  currentRound: number;
  status: 'waiting' | 'betting' | 'playing' | 'completed';
  openingCard: any;
  currentCard: any;
  winningSide: 'andar' | 'bahar' | null;
  totalCards: number;
  currentCardIndex: number;
  roundStartTime: Date;
  roundEndTime: Date;
  bets: Array<{
    userId: string;
    amount: number;
    side: 'andar' | 'bahar';
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export const GameStateSchema = new mongoose.Schema<GameState>({
  id: { type: String, required: true, unique: true },
  currentRound: { type: Number, required: true, min: 1 },
  status: { 
    type: String, 
    enum: ['waiting', 'betting', 'playing', 'completed'], 
    default: 'waiting' 
  },
  openingCard: { type: mongoose.Schema.Types.Mixed, default: null },
  currentCard: { type: mongoose.Schema.Types.Mixed, default: null },
  winningSide: { 
    type: String, 
    enum: ['andar', 'bahar', null], 
    default: null 
  },
  totalCards: { type: Number, default: 52 },
  currentCardIndex: { type: Number, default: 0 },
  roundStartTime: { type: Date, default: Date.now },
  roundEndTime: { type: Date, default: null },
  bets: [{
    userId: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    side: { 
      type: String, 
      enum: ['andar', 'bahar'], 
      required: true 
    },
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Create and export models
export const UserModel = mongoose.models.User || mongoose.model<User>('User', UserSchema);
export const TransactionModel = mongoose.models.Transaction || mongoose.model<Transaction>('Transaction', TransactionSchema);
export const GameHistoryModel = mongoose.models.GameHistory || mongoose.model<GameHistory>('GameHistory', GameHistorySchema);
export const SiteContentModel = mongoose.models.SiteContent || mongoose.model<SiteContent>('SiteContent', SiteContentSchema);
export const AdminModel = mongoose.models.Admin || mongoose.model<Admin>('Admin', AdminSchema);
export const GameStateModel = mongoose.models.GameState || mongoose.model<GameState>('GameState', GameStateSchema);

// Export models with more convenient names
export const User = UserModel;
export const Transaction = TransactionModel;
export const GameHistory = GameHistoryModel;
export const SiteContent = SiteContentModel;
export const Admin = AdminModel;
export const GameState = GameStateModel;

// Database connection utility
export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/andarbahar';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Database disconnection utility
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('MongoDB disconnection error:', error);
  }
};

// Initialize default data
export const initializeDefaultData = async (): Promise<void> => {
  try {
    // Check if site content exists, create default if not
    const existingContent = await SiteContent.findOne();
    if (!existingContent) {
      const defaultContent = new SiteContent({
        id: 'default-site-content',
        whatsappNumber: '+91 8686886632',
        siteTitle: 'Andar Bahar Game',
        siteSubtitle: 'Play and Win Real Money',
        heroTitle: 'Welcome to Andar Bahar',
        heroDescription: 'Experience the thrill of traditional Indian card game',
        aboutContent: 'Welcome to our Andar Bahar gaming platform. We provide a fair and secure gaming experience with real money winnings.',
        contactInfo: {
          phone: '+91 8686886632',
          email: 'support@andarbahar.com',
          address: 'India'
        },
        gameRules: 'Andar Bahar is a traditional Indian card game. The game starts with one card placed in the middle. Players bet on whether the next matching card will appear on the Andar (left) or Bahar (right) side.',
        terms: 'By using this platform, you agree to our terms and conditions. You must be 18+ to play. Please gamble responsibly.',
        privacyPolicy: 'We take your privacy seriously. All personal information is encrypted and stored securely.',
        maintenanceMode: false,
        maintenanceMessage: '',
        depositBonus: 10,
        referralCommission: 5,
        backupFrequency: 'daily',
        whatsappBusinessAPI: ''
      });
      await defaultContent.save();
      console.log('Default site content created');
    }

    // Check if admin user exists, create default if not
    const existingAdmin = await Admin.findOne({ email: 'admin@andarbahar.com' });
    if (!existingAdmin) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      const defaultAdmin = new Admin({
        id: 'default-admin',
        name: 'System Administrator',
        email: 'admin@andarbahar.com',
        mobile: '9999999999',
        password: hashedPassword,
        role: 'superadmin',
        permissions: ['all'],
        status: 'active'
      });
      await defaultAdmin.save();
      console.log('Default admin user created');
    }

    console.log('Default data initialization completed');
  } catch (error) {
    console.error('Default data initialization error:', error);
  }
};
