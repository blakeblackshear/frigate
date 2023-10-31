target wget {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/arm64"]
  target = "wget"
}

target wheels {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/arm64"]
  target = "wheels"
}

target frigate {
  dockerfile = "docker/main/Dockerfile"
  platforms = ["linux/arm64"]
  target = "frigate"
}

target rk {
  dockerfile = "docker/rockchip/Dockerfile"
  contexts = {
    wget = "target:wget",
    wheels = "target:wheels",
    frigate = "target:frigate"
  }
  platforms = ["linux/arm64"]
}