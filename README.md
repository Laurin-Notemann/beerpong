# SETUP
```sh
git clone https://github.com/Laurin-Notemann/beerpong 
```

Copy .env and check all the values
```sh
cp .env.example .env
```

Initial docker database
```sh
make docker-db-up
```

Stop docker database
```sh
make docker-db-stop
```

Start docker database
```sh
make docker-db-start
```

Remove docker database
```sh
make docker-db-down
```


# How to Git

```sh
git clone https://github.com/Laurin-Notemann/beerpong 
```

## Create new Feature
1. Create new branch
```sh
git checkout -b "branch-name"
```

2. Work on Feature

3. Commit to branch
```sh
git add .
git commit -m "commit-msg"
```

4. Push to branch
```sh
git push origin branch-name
```

5. Create PR 

6. Wait for Approval

# Setup of pre-commit

1. 
```sh
ln ./scripts/pre-commit .git/hooks/pre-commit
```
