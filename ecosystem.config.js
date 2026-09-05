module.exports = {
  apps: [
    {
      name: 'ayaya',
      script: 'npm',
      args: 'start',
      cwd: '/root/patrickmarshall/ayayaya-bot',
      node_args: '--dns-result-order=ipv4first',
      restart_delay: 5000, // wait 5s before restart so port 3000 is freed
      max_restarts: 20,
      min_uptime: '10s',
    },
  ],
};
