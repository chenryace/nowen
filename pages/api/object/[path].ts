import { NextApiRequest, NextApiResponse } from 'next';
import { createStore } from 'libs/server/store';
import { useAuth } from 'libs/server/middlewares/auth';
import { api } from 'libs/server/connect';

export default api()
    .use(useAuth)
    .get(async (req: NextApiRequest, res: NextApiResponse) => {
        const path = decodeURIComponent(req.query.path as string);
        const store = createStore();
        
        try {
            const { content, contentType, buffer } = await store.getObjectAndMeta(path);
            
            if (!content && !buffer) {
                return res.status(404).end('Not Found');
            }
            
            // 设置内容类型
            if (contentType) {
                res.setHeader('Content-Type', contentType);
            } else if (path.endsWith('.png')) {
                res.setHeader('Content-Type', 'image/png');
            } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
                res.setHeader('Content-Type', 'image/jpeg');
            } else if (path.endsWith('.gif')) {
                res.setHeader('Content-Type', 'image/gif');
            } else if (path.endsWith('.svg')) {
                res.setHeader('Content-Type', 'image/svg+xml');
            } else {
                res.setHeader('Content-Type', 'application/octet-stream');
            }
            
            // 返回内容
            res.send(buffer);
        } catch (error) {
            console.error('Error fetching object:', error);
            res.status(500).end('Internal Server Error');
        }
    });