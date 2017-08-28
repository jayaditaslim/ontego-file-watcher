# ontego-file-watcher
### Initial Configuration
- Type in ***npm install*** to download all dependencies needed. If errors are found during dependencies installation, manually install packages listed in **package.json**'s dependencies.
- Supply your workspace configurations in ***server.ts*** file.
- To compile, execute ***npm run tsc***. If you want continuous build after every source change, execute ***npm run watch*** instead.
- During compilation, errors might be found indicating duplicate identifiers, but as long as the ***lib*** folder is generated, you can safely ignore the error.
- To ensure that your configuration is correct, you should see several lines of outputs indicating that all files in your supplied directory is now added in the watch list.
### Current Project Condition / Issues
- Most of the code has been changed to follow the new flow-editor's JSON naming conventions.
- **Performance Issue** Currently, on any file changes, the main.mapp will be rebuilt. Unsure if this will impact performance significantly.
- DataBuilder now works on documents with *odataxml* extension instead of mdata.
- **Data mapping has been moved from vertice to the connections. This requires major rework on the algorithm for data mappings.**