import { Router } from 'express';
import { container } from 'tsyringe';
import { ClientController } from './controllers/ClientController';
import { authenticate, adminOnly, validate } from '../../../middlewares';
import { createClientSchema, updateClientSchema, paginationSchema } from '../../../utils/validators';

// Register Dependencies
import { SequelizeClientRepository } from '../infrastructure/repositories/SequelizeClientRepository';
import { SequelizeUserRepository } from '../../auth/infrastructure/repositories/SequelizeUserRepository';

container.register("IClientRepository", { useClass: SequelizeClientRepository });
// container.register("IUserRepository", { useClass: SequelizeUserRepository }); 
// Note: IUserRepository might already be registered in Auth module or Global scope. 
// If not, we might duplicate registration. Safe to register if singleton not enforced strictly or lifecycle matches.
// For safety, let's assume one registry per App, but here for Route isolation we register what we need.
if (!container.isRegistered("IUserRepository")) {
  container.register("IUserRepository", { useClass: SequelizeUserRepository });
}

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Clients
 *   description: Client management endpoints
 */

router.use(authenticate, adminOnly);

/**
 * @openapi
 * /clients:
 *   post:
 *     tags: [Clients]
 *     summary: Create a new client
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, code]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       201:
 *         description: Client created successfully
 */
router.post('/', validate(createClientSchema), ClientController.createClient);

/**
 * @openapi
 * /clients:
 *   get:
 *     tags: [Clients]
 *     summary: Get list of clients with pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of clients retrieved
 */
router.get('/', validate(paginationSchema, 'query'), ClientController.getClients);

/**
 * @openapi
 * /clients/next-code:
 *   get:
 *     tags: [Clients]
 *     summary: Get next available client code
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Next code retrieved
 */
router.get('/next-code', ClientController.getNextCode);

/**
 * @openapi
 * /clients/{id}:
 *   get:
 *     tags: [Clients]
 *     summary: Get client details by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client details retrieved
 */
router.get('/:id', ClientController.getClient);

/**
 * @openapi
 * /clients/{id}:
 *   put:
 *     tags: [Clients]
 *     summary: Update client details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Client updated successfully
 */
router.put('/:id', validate(updateClientSchema), ClientController.updateClient);

/**
 * @openapi
 * /clients/{id}:
 *   delete:
 *     tags: [Clients]
 *     summary: Delete a client
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client deleted successfully
 */
router.delete('/:id', ClientController.deleteClient);

export default router;
