# k3d local development targets
CLUSTER_NAME ?= uptime-dev
CLUSTER_SERVER_SIZE ?= 1
CLUSTER_SERVER_VERSION ?= v1.31.4-k3s1
REGISTRY_PORT ?= 9097
REGISTRY_NAME_CREATE ?= $(CLUSTER_NAME)-registry
REGISTRY_NAME = k3d-$(REGISTRY_NAME_CREATE)

## build-images: make docker images for each project
.PHONY: build-images
build-images:
	@for project in $(PROJECT_DIRS); do pushd $${project}; \
    		make docker || exit 1; \
	popd; done

## k3d-build-images: make docker images for k3d
.PHONY: k3d-build-images
k3d-build-images: build-images

## k3d-registry-create: create a local registry for k3d cluster
.PHONY: k3d-registry-create
k3d-registry-create:
	k3d registry list -o json | jq -e --arg name '$(REGISTRY_NAME)' '.[] | select(.name == $$name)' > /dev/null || \
		k3d registry create $(REGISTRY_NAME_CREATE) -p $(REGISTRY_PORT)

## k3d-cluster: create new k3d cluster and registry for local development
.PHONY: k3d-cluster
k3d-cluster: k3d-registry-create
	k3d cluster create $(CLUSTER_NAME) \
		-v $(CURDIR)/.k3d:/data \
		-p 8081:80@loadbalancer \
		-p 8082:443@loadbalancer \
		-s $(CLUSTER_SERVER_SIZE) \
		--registry-use=$(REGISTRY_NAME):$(REGISTRY_PORT) 

## k3d-up: bring up k3d cluster for local development
.PHONY: k3d-up
k3d-up: k3d-cluster k3d-registry-create

## k3d-down: tear down the k3d cluster, registry, and all development services
.PHONY: k3d-down
k3d-down: k3d-clean k3d-registry-clean

## k3d-clean: stop and delete the k3d cluster
.PHONY: k3d-clean
k3d-clean:
	k3d cluster stop $(CLUSTER_NAME)
	k3d cluster delete $(CLUSTER_NAME)

## k3d-registry-clean: delete the local image registry
.PHONY: k3d-registry-clean
k3d-registry-clean:
	k3d registry delete $(REGISTRY_NAME)

.PHONY: tilt-up
tilt-up:
	cd deployment && \
	tilt up