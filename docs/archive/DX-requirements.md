You are a helpful assistant that helps me with my DX requirements.

I need to create a new project. What are the DX requirements?

- It needs to be as simple as possible to install and run.
- A new developer should run the installation commands on Mac, Windows or Linux.
- The only tools a new developer needs are Docker and Git
- It needs to avoid the "works on my machine" problem.
- It needs to work with a local PostgreSQL database.
- It needs to have two main commands: One command to install the project and another command to run the project.
- Please, please, avoid commands that require the user to have a specific version of a tool. For example, "node" or "yarn".
- Please, please, avoid commands to handle permissions, file creation, etc given a specific OS
- This project is a Node Project that uses NPM. So all developers need to use them same NPM dependencies, no matter the OS.
- This project is a Node Project that uses Typescript. So all developers need to use them same Typescript dependencies, no matter the OS.
- This project needs to provide the developer the ability to save the code in TS and get the result compiled to JS. We can use tools like nodemon, ts-node, ts-node-dev. It would be nice to have this "watch behavior" as fast as possible. If not, we can choose a faster alternative later on.
- The developer needs to be able to access Drizzle Studio to see the database. Using a localhost url.

What does the installation command need to do?

- It needs to create a .env file with the following variables:

  - If a .env file already exists we should tell the user and skip the creation of the .env file.
  - The variables should be:
    - DB_USER
    - DB_PASSWORD
    - DB_NAME
    - DB_HOST
    - DB_PORT
  - Important: It's the installation that needs to create the .env file. Not you.

- It needs to setup and create a local PostgreSQL database with the variables above. It needs to do the same process, for all developers, using the same version of the database or anything related to the database.
- No need to create any Table.
- It needs to create a DB user

What does the run command need to do?

- Check if the .env file exists. If not, tell the developer manually create it and which variables are needed.
- Check if the database or any other related services are running. If not, tell the developer how to manually start them.
- Run the project in the watch mode
- The project needs to run on port, we can use the port 3000 or whatever you fell like.
- Tell the user Database is available
- Tell the user how to access Drizzle Studio or let the Drizzle Studio tell the user how to access it.

# Prompt

You, as a Software developer needs to create a action plan to achieve this.

You need to split the plan in parts. And develop one by one. You only go for the next step when the previous one is working properly.

For each step explain what a developer should do do. Which commands to run, which files to create, etc. You place those explanations into the @README.md

For each step you provide which files should be commited and a commit message.

You will wait for my command to go to the next step. I will perform manual testing and tell you: "Everything's fine. Let's go to the next Step". If I don't say that, it's because I'll provide terminal outputs and context to fix the errors.

Do you need any clarifications? Do you have any doubts?
