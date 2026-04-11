import jwt from 'jsonwebtoken';

function getBearerToken(authorizationHeader) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

export function requireAuth(req, res, next) {
  const token = getBearerToken(req.headers.authorization);
  const secret = process.env.JWT_SECRET;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!secret || secret === 'replace-me') {
    res.status(503).json({ error: 'Auth is not configured' });
    return;
  }

  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
}