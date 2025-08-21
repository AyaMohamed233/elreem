// Authentication middleware
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

// Admin authentication middleware
function ensureAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.is_admin) {
        return next();
    }
    res.status(403).json({ error: 'Access denied. Admin privileges required.' });
}

// Guest middleware (redirect authenticated users)
function ensureGuest(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    next();
}

// API authentication middleware
function ensureAuthenticatedAPI(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Authentication required' });
}

module.exports = {
    ensureAuthenticated,
    ensureAdmin,
    ensureGuest,
    ensureAuthenticatedAPI
};
