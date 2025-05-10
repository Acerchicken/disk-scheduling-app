## How to run

First, build the container:

```bash
docker build -t disk-scheduling-app .
```

Then, run the container:

```bash
docker run -d -p 3001:3001 --name disk-container disk-scheduling-app
```

Open [http://localhost:3001](http://localhost:3001) and enjoy.
