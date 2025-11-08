import type {FastifyInstance, FastifyPluginOptions} from 'fastify';
import {z} from 'zod';

const oembedQuerySchema = z.object({
  author: z.string().optional(),
});

export default function oembedRouter(app: FastifyInstance, _options: FastifyPluginOptions) {
  // GET /api/v1/oembed - oEmbed endpoint
  app.get<{
    Querystring: z.infer<typeof oembedQuerySchema>;
  }>('/', async (request, reply) => {
    const validated = oembedQuerySchema.parse(request.query);

    // https://oembed.com/#section2.3
    return reply.send({
      type: 'link',
      version: '1.0',
      author_name: validated.author,
    });
  });
}
