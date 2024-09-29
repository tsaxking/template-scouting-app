import { Route } from '../structure/app/app';
import si from 'systeminformation';

export const router = new Route();

router.post('/computer-state', async (req, res) => {
    const [cpu, memory, temp] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.cpuTemperature()
    ]);
    res.json({
        cpu,
        memory,
        temp
    });
});
