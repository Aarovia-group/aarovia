import { Router } from 'express'
import { getProjects, getProjectById, createProject, updateProject, deleteProject } from '../controllers/project.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)

router.get('/', getProjects)
router.post('/', authorize('SUPER_ADMIN', 'ADMIN'), createProject)
router.get('/:id', getProjectById)
router.put('/:id', authorize('SUPER_ADMIN', 'ADMIN'), updateProject)
router.delete('/:id', authorize('SUPER_ADMIN'), deleteProject)

export default router
