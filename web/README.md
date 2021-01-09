# Frigate Web UI

## Development

1. Build the docker images in the root of the repository `make amd64_all` (or appropriate for your system)
2. Create a config file in `config/`
3. Run the container: `docker run --rm --name frigate --privileged -v $PWD/config:/config:ro -v /etc/localtime:/etc/localtime:ro -p 5000:5000 frigate`
4. Run the dev ui: `cd web && npm run start`
