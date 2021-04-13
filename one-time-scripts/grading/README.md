# Grading
This grades all the tests automatically from a CSV. Make sure if you run this to keep all data in the `private-data` folder. 

Make sure you run this from the base directory: 
```
ts-node one-time-scripts/grading/grade.ts
```

Otherwise, the file won't be read properly.

## Potentional Bugs
1. csv won't work with quotes, use a csv-writer package