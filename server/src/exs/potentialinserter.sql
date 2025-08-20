CREATE function dog (a TEXT, b TEXT) RETURNS void as
  $$
    begin
      INSERT into happy (dog, cat) VALUES (a, b);
      INSERT into happy (dog, cat) VALUES (a, b);
    end;
  $$
language pgpsql;