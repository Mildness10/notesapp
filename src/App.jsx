import { useState, useEffect } from "react";
import {
  Authenticator,
  Button,
  Text,
  TextField,
  Heading,
  Flex,
  View,
  Grid,
  Image,
  Divider,
  TextAreaField,
} from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { uploadData, getUrl, remove } from 'aws-amplify/storage';
import "@aws-amplify/ui-react/styles.css";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);

const client = generateClient({
  authMode: "userPool",
});

export default function App() {
  const [notes, setNotes] = useState([]);
  const [imageUrls, setImageUrls] = useState({});

  useEffect(() => {
    const sub = client.models.Note.observeQuery().subscribe({
      next: ({ items }) => {
        setNotes([...items]);
      },
    });
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchImageUrls = async () => {
      const urls = {};
      for (const note of notes) {
        if (note.image) {
          try {
            const urlResult = await getUrl({ path: note.image });
            urls[note.id] = urlResult.url;
          } catch (error) {
            console.error("Error getting URL for note image", error);
          }
        }
      }
      setImageUrls(urls);
    };
    if (notes.length > 0) {
      fetchImageUrls();
    }
  }, [notes]);

  async function createNote(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const image = form.get("image");
    let imageKey = null;

    if (image && image.name) {
      try {
        const uploadTask = uploadData({
          path: `media/${Date.now()}-${image.name}`,
          data: image,
        });
        const result = await uploadTask.result;
        imageKey = result.path;
      } catch (error) {
        console.error("Error uploading image", error);
      }
    }

    await client.models.Note.create({
      name: form.get("name"),
      description: form.get("description"),
      image: imageKey,
    });
    event.target.reset();
  }

  async function deleteNote({ id, image }) {
    if (image) {
      try {
        await remove({ path: image });
      } catch (error) {
        console.error("Error removing image", error);
      }
    }
    await client.models.Note.delete({ id });
  }

  return (
    <Authenticator>
      {({ signOut }) => (
        <Flex
          className="App"
          justifyContent="center"
          alignItems="center"
          direction="column"
          width="70%"
          margin="0 auto"
        >
          <Heading level={1}>My Notes</Heading>
          <View as="form" margin="3rem 0" onSubmit={createNote}>
            <Flex
              direction="column"
              justifyContent="center"
              gap="2rem"
              padding="2rem"
            >
              <TextField
                name="name"
                placeholder="Note Name"
                label="Note Name"
                labelHidden
                variation="quiet"
                required
              />
              <TextAreaField
                name="description"
                placeholder="Note Description"
                label="Note Description"
                labelHidden
                variation="quiet"
                required
              />
              <View
                name="image"
                as="input"
                type="file"
                style={{ alignSelf: "end" }}
              />
              <Button type="submit" variation="primary">
                Create Note
              </Button>
            </Flex>
          </View>
          <Divider />
          <Heading level={2}>Current Notes</Heading>
          <Grid
            margin="3rem 0"
            templateColumns="1fr 1fr 1fr"
            gap="2rem"
            alignContent="center"
          >
            {notes.map((note) => (
              <Flex
                key={note.id}
                direction="column"
                justifyContent="center"
                alignItems="center"
                gap="1rem"
                border="1px solid #ccc"
                padding="2rem"
                borderRadius="5%"
                className="box"
              >
                <Heading level={3}>{note.name}</Heading>
                <Text>{note.description}</Text>
                {note.image && imageUrls[note.id] && (
                  <Image
                    src={imageUrls[note.id]}
                    alt={`visual aid for ${note.name}`}
                    style={{ width: "200px" }}
                  />
                )}
                <Button variation="destructive" onClick={() => deleteNote(note)}>
                  Delete note
                </Button>
              </Flex>
            ))}
          </Grid>
          <Button onClick={signOut}>Sign Out</Button>
        </Flex>
      )}
    </Authenticator>
  );
}