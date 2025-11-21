target frigate {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/amd64", "linux/arm64"]
  target = "frigate"
}

target axcl {
  dockerfile = "docker/axcl/Dockerfile"
  contexts = {
    frigate = "target:frigate",
  }
  platforms = ["linux/amd64", "linux/arm64"]
}