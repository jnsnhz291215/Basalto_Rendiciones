/**
 * checkRole(['SUPER_ADMIN_DEV', 'SUPER_ADMIN', 'ADMIN_CAJA'])
 * Debe usarse después de authMiddleware.
 */
function checkRole(rolesPermitidos = []) {
  const allowed = Array.isArray(rolesPermitidos) ? rolesPermitidos : [rolesPermitidos]

  return (req, res, next) => {
    if (!req.user?.rol) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (!allowed.includes(req.user.rol)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Rol ${req.user.rol} no autorizado para esta acción`
      })
    }
    return next()
  }
}

const ROLES = {
  SUPER_ADMIN_DEV: 'SUPER_ADMIN_DEV',
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN_CAJA: 'ADMIN_CAJA',
  USER_RENDIDOR: 'USER_RENDIDOR'
}

const ADMINS = [ROLES.SUPER_ADMIN_DEV, ROLES.SUPER_ADMIN, ROLES.ADMIN_CAJA]
const SUPER_ADMINS = [ROLES.SUPER_ADMIN_DEV, ROLES.SUPER_ADMIN]

module.exports = { checkRole, ROLES, ADMINS, SUPER_ADMINS }
