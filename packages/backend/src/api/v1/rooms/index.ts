import type {FastifyInstance, FastifyPluginOptions} from 'fastify';
import {z} from 'zod';
import {RoomEventRepository} from '../../../repositories';
import {RoomService} from '../../../services';
import type {RoomId} from '@crosswithfriends/shared';
import {NotFoundError} from '../../../lib/errors.js';

const createRoomSchema = z.object({
  rid: z.string().optional(),
});

const roomParamsSchema = z.object({
  rid: z.string().min(1),
});

export default function roomsRouter(app: FastifyInstance, _options: FastifyPluginOptions) {
  // Initialize services
  const roomEventRepo = new RoomEventRepository();
  const roomService = new RoomService(roomEventRepo);

  // POST /api/v1/rooms - Create room
  app.post<{
    Body: z.infer<typeof createRoomSchema>;
  }>('/', async (request, reply) => {
    const validated = createRoomSchema.parse(request.body);
    const result = roomService.createRoom({
      ...(validated.rid !== undefined ? {rid: validated.rid} : {}),
    });
    return reply.status(201).send(result);
  });

  // GET /api/v1/rooms/:rid - Get room info
  app.get<{Params: z.infer<typeof roomParamsSchema>}>('/:rid', async (request, reply) => {
    const {rid} = roomParamsSchema.parse(request.params);
    const room = await roomService.getRoomState(rid as RoomId);

    if (!room) {
      throw new NotFoundError(`Room ${rid} not found`);
    }

    return reply.send({room});
  });

  // GET /api/v1/rooms/:rid/events - Get room event history
  app.get<{Params: z.infer<typeof roomParamsSchema>}>('/:rid/events', async (request, reply) => {
    const {rid} = roomParamsSchema.parse(request.params);
    const events = await roomService.getRoomEvents(rid);
    return reply.send({events});
  });
}
