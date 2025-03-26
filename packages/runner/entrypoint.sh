#! /bin/sh

case $1 in
  "queue") node queue.js;;
  "execute") node execute.js;;
  *) echo "missing command, queue or execute";;
esac
