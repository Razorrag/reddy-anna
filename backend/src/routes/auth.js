import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { query } from '../db-supabase.js';

const router = Router();



router.post(
  '/signup',
  [
    body('fullName').trim().isLength({ min: 1 }).withMessage('Full name is required'),
    body('mobile').trim().isLength({ min: 8 }).withMessage('Mobile is required'),
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
    body('terms').equals('true').withMessage('Terms must be accepted')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { fullName, mobile, email, password, referralCode } = req.body;

      const existingByMobile = await query('SELECT id FROM users WHERE mobile = $1', [mobile]);
      if (existingByMobile.length > 0) {
        return res.status(409).json({ message: 'Mobile already registered' });
      }

      if (email) {
        const existingByEmail = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingByEmail.length > 0) {
          return res.status(409).json({ message: 'Email already registered' });
        }
      }

      const passwordHash = await bcrypt.hash(password, 10);

      await query(
        'INSERT INTO users (full_name, mobile, email, referral_code, password_hash, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
        [fullName, mobile, email || null, referralCode || null, passwordHash]
      );

      return res.status(201).json({ message: 'Signup successful' });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/login',
  [
    body('mobile').trim().isLength({ min: 8 }).withMessage('Mobile is required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { mobile, password } = req.body;
      const users = await query('SELECT id, full_name, mobile, email, password_hash FROM users WHERE mobile = $1', [mobile]);
      if (users.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const user = users[0];
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      return res.json({ message: 'Logged in successfully', user: { id: user.id, name: user.full_name, mobile: user.mobile, email: user.email } });
    } catch (err) {
      next(err);
    }
  }
);

// Get user profile
router.get('/profile', async (req, res, next) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ message: 'User ID required' });
        }

        const users = await query('SELECT id, full_name, mobile, email, referral_code, date_of_birth, address, city, state, created_at FROM users WHERE id = $1', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];
        return res.json({
            id: user.id,
            name: user.full_name,
            mobile: user.mobile,
            email: user.email,
            referralCode: user.referral_code,
            dateOfBirth: user.date_of_birth,
            address: user.address,
            city: user.city,
            state: user.state,
            createdAt: user.created_at
        });
    } catch (err) {
        next(err);
    }
});

// Update user profile
router.put('/profile', [
    body('userId').isInt().withMessage('Valid user ID required'),
    body('name').optional().trim().isLength({ min: 1 }).withMessage('Name must not be empty'),
    body('email').optional().isEmail().withMessage('Valid email required').normalizeEmail(),
    body('dateOfBirth').optional().isISO8601().withMessage('Valid date required'),
    body('address').optional().trim(),
    body('city').optional().trim(),
    body('state').optional().trim()
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId, name, email, dateOfBirth, address, city, state } = req.body;
        
        // Check if user exists
        const users = await query('SELECT id FROM users WHERE id = $1', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if email is already taken by another user
        if (email) {
            const existingEmail = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
            if (existingEmail.length > 0) {
                return res.status(409).json({ message: 'Email already taken' });
            }
        }

        // Update user
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        
        if (name) {
            updateFields.push(`full_name = ${paramIndex}`);
            updateValues.push(name);
            paramIndex++;
        }
        if (email) {
            updateFields.push(`email = ${paramIndex}`);
            updateValues.push(email);
            paramIndex++;
        }
        if (dateOfBirth) {
            updateFields.push(`date_of_birth = ${paramIndex}`);
            updateValues.push(dateOfBirth);
            paramIndex++;
        }
        if (address !== undefined) {
            updateFields.push(`address = ${paramIndex}`);
            updateValues.push(address);
            paramIndex++;
        }
        if (city) {
            updateFields.push(`city = ${paramIndex}`);
            updateValues.push(city);
            paramIndex++;
        }
        if (state) {
            updateFields.push(`state = ${paramIndex}`);
            updateValues.push(state);
            paramIndex++;
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }
        
        updateValues.push(userId);
        await query(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ${paramIndex}`, updateValues);

        return res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        next(err);
    }
});

// Get user dashboard data
router.get('/dashboard', async (req, res, next) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ message: 'User ID required' });
        }

        // Get user info
        const users = await query('SELECT full_name, mobile, email, date_of_birth, address, city, state FROM users WHERE id = $1', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];
        console.log('User data from database:', user);
        
        // Mock dashboard data (in real app, calculate from actual transactions)
        const dashboardData = {
            user: {
                name: user.full_name,
                mobile: user.mobile,
                email: user.email,
                dateOfBirth: user.date_of_birth,
                address: user.address,
                city: user.city,
                state: user.state
            },
            stats: {
                currentBalance: 5000,
                totalDeposits: 12500,
                totalWithdrawals: 7500,
                gamesPlayed: 156
            },
            recentTransactions: [
                {
                    id: 'TXN001',
                    type: 'Deposit',
                    amount: 5000,
                    method: 'UPI',
                    status: 'Completed',
                    date: '2024-01-15'
                },
                {
                    id: 'TXN002',
                    type: 'Withdraw',
                    amount: 2500,
                    method: 'Bank Transfer',
                    status: 'Pending',
                    date: '2024-01-15'
                }
            ],
            gameHistory: [
                {
                    id: 'GAME001',
                    type: 'Andar Bahar',
                    betAmount: 500,
                    result: 'Andar',
                    winLoss: 500,
                    date: '2024-01-15'
                }
            ],
            referralStats: {
                totalReferrals: 5,
                deposited: 3,
                totalDeposits: 24000,
                totalCommission: 600
            }
        };

        return res.json(dashboardData);
    } catch (err) {
        next(err);
    }
});

// Change password
router.put('/change-password', [
    body('userId').isInt().withMessage('Valid user ID required'),
    body('currentPassword').isLength({ min: 6 }).withMessage('Current password required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId, currentPassword, newPassword } = req.body;
        
        // Get user with password hash
        const users = await query('SELECT id, password_hash FROM users WHERE id = $1', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];
        
        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, userId]);

        return res.json({ message: 'Password changed successfully' });
    } catch (err) {
        next(err);
    }
});

// Admin APIs for user management

// Get all users (admin only)
router.get('/admin/users', async (req, res, next) => {
    try {
        const users = await query(`
            SELECT 
                id, 
                full_name, 
                mobile, 
                email, 
                referral_code, 
                date_of_birth, 
                address, 
                city, 
                state, 
                created_at,
                CASE 
                    WHEN id IN (SELECT user_id FROM blocked_users) THEN 'Inactive'
                    ELSE 'Active'
                END as status
            FROM users 
            ORDER BY created_at DESC
        `);
        
        return res.json(users);
    } catch (err) {
        next(err);
    }
});

// Create new user (admin)
router.post('/admin/users', [
    body('fullName').trim().isLength({ min: 1 }).withMessage('Full name is required'),
    body('mobile').trim().isLength({ min: 8 }).withMessage('Mobile is required'),
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('dateOfBirth').optional().isISO8601().withMessage('Valid date required'),
    body('address').optional().trim(),
    body('city').optional().trim(),
    body('state').optional().trim(),
    body('referralCode').optional().trim()
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { fullName, mobile, email, password, dateOfBirth, address, city, state, referralCode } = req.body;

        // Check if mobile already exists
        const existingMobile = await query('SELECT id FROM users WHERE mobile = $1', [mobile]);
        if (existingMobile.length > 0) {
            return res.status(409).json({ message: 'Mobile number already registered' });
        }

        // Check if email already exists
        if (email) {
            const existingEmail = await query('SELECT id FROM users WHERE email = $1', [email]);
            if (existingEmail.length > 0) {
                return res.status(409).json({ message: 'Email already registered' });
            }
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert new user
        await query(`
            INSERT INTO users (full_name, mobile, email, password_hash, date_of_birth, address, city, state, referral_code, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `, [fullName, mobile, email || null, passwordHash, dateOfBirth || null, address || null, city || null, state || null, referralCode || null]);

        return res.status(201).json({ 
            message: 'User created successfully' 
        });
    } catch (err) {
        next(err);
    }
});

// Update user (admin)
router.put('/admin/users/:userId', [
    body('fullName').optional().trim().isLength({ min: 1 }).withMessage('Full name must not be empty'),
    body('mobile').optional().trim().isLength({ min: 8 }).withMessage('Mobile must be valid'),
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Valid email required').normalizeEmail(),
    body('dateOfBirth').optional().isISO8601().withMessage('Valid date required'),
    body('address').optional().trim(),
    body('city').optional().trim(),
    body('state').optional().trim(),
    body('referralCode').optional().trim()
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const userId = req.params.userId;
        const { fullName, mobile, email, dateOfBirth, address, city, state, referralCode } = req.body;

        // Check if user exists
        const users = await query('SELECT id FROM users WHERE id = $1', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if mobile is taken by another user
        if (mobile) {
            const existingMobile = await query('SELECT id FROM users WHERE mobile = $1 AND id != $2', [mobile, userId]);
            if (existingMobile.length > 0) {
                return res.status(409).json({ message: 'Mobile number already taken' });
            }
        }

        // Check if email is taken by another user
        if (email) {
            const existingEmail = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
            if (existingEmail.length > 0) {
                return res.status(409).json({ message: 'Email already taken' });
            }
        }

        // Build update query
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        
        if (fullName) {
            updateFields.push(`full_name = ${paramIndex}`);
            updateValues.push(fullName);
            paramIndex++;
        }
        if (mobile) {
            updateFields.push(`mobile = ${paramIndex}`);
            updateValues.push(mobile);
            paramIndex++;
        }
        if (email !== undefined) {
            updateFields.push(`email = ${paramIndex}`);
            updateValues.push(email);
            paramIndex++;
        }
        if (dateOfBirth !== undefined) {
            updateFields.push(`date_of_birth = ${paramIndex}`);
            updateValues.push(dateOfBirth);
            paramIndex++;
        }
        if (address !== undefined) {
            updateFields.push(`address = ${paramIndex}`);
            updateValues.push(address);
            paramIndex++;
        }
        if (city) {
            updateFields.push(`city = ${paramIndex}`);
            updateValues.push(city);
            paramIndex++;
        }
        if (state) {
            updateFields.push(`state = ${paramIndex}`);
            updateValues.push(state);
            paramIndex++;
        }
        if (referralCode !== undefined) {
            updateFields.push(`referral_code = ${paramIndex}`);
            updateValues.push(referralCode);
            paramIndex++;
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }
        
        updateValues.push(userId);
        await query(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ${paramIndex}`, updateValues);

        return res.json({ message: 'User updated successfully' });
    } catch (err) {
        next(err);
    }
});

// Block/Unblock user
router.put('/admin/users/:userId/block', [
    body('blocked').isBoolean().withMessage('Blocked status is required')
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const userId = req.params.userId;
        const { blocked } = req.body;

        // Check if user exists
        const users = await query('SELECT id FROM users WHERE id = $1', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (blocked) {
            // Block user - insert into blocked_users table
            await query('INSERT INTO blocked_users (user_id, blocked_at) VALUES ($1, NOW()) ON CONFLICT (user_id) DO NOTHING', [userId]);
        } else {
            // Unblock user - remove from blocked_users table
            await query('DELETE FROM blocked_users WHERE user_id = $1', [userId]);
        }

        return res.json({ 
            message: blocked ? 'User blocked successfully' : 'User unblocked successfully' 
        });
    } catch (err) {
        next(err);
    }
});

// Admin Authentication APIs

// Admin login
router.post('/admin/login', [
    body('username').trim().isLength({ min: 1 }).withMessage('Username is required'),
    body('password').isLength({ min: 1 }).withMessage('Password is required')
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        // Find admin by username
        const admins = await query('SELECT * FROM admins WHERE username = $1', [username]);
        
        if (admins.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const admin = admins[0];

        // Check if admin is active
        if (!admin.is_active) {
            return res.status(401).json({ message: 'Admin account is deactivated' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin.password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Update last login
        await query('UPDATE admins SET last_login = NOW() WHERE id = $1', [admin.id]);

        // Return admin info (without password)
        const adminInfo = {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            full_name: admin.full_name,
            role: admin.role,
            last_login: admin.last_login
        };

        return res.json({
            message: 'Admin login successful',
            admin: adminInfo
        });
    } catch (err) {
        next(err);
    }
});

// Admin logout (optional - for session management)
router.post('/admin/logout', async (req, res, next) => {
    try {
        // In a real app, you might invalidate JWT tokens or server-side sessions here
        return res.json({ message: 'Admin logout successful' });
    } catch (err) {
        next(err);
    }
});

// Get admin profile
router.get('/admin/profile', async (req, res, next) => {
    try {
        // In a real app, you'd validate the admin session/token here
        // For now, we'll return a placeholder
        return res.json({ message: 'Admin profile endpoint - implement session validation' });
    } catch (err) {
        next(err);
    }
});

export default router;


