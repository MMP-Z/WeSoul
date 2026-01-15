import axios from 'axios';

const IMGBB_API_KEY = '98db1937b567c86b46c561ea407cb5cc';
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

export interface ImgBBResponse {
    data: {
        id: string;
        title: string;
        url_viewer: string;
        url: string;
        display_url: string;
        width: string;
        height: string;
        size: string;
        time: string;
        expiration: string;
        image: {
            filename: string;
            name: string;
            mime: string;
            extension: string;
            url: string;
        };
        thumb: {
            filename: string;
            name: string;
            mime: string;
            extension: string;
            url: string;
        };
        medium?: {
            filename: string;
            name: string;
            mime: string;
            extension: string;
            url: string;
        };
        delete_url: string;
    };
    success: boolean;
    status: number;
}

export const imageUploadService = {
    uploadImage: async (file: File): Promise<string | null> => {
        try {
            const formData = new FormData();
            formData.append('image', file);

            // Note: key is passed as query param in the example URL structure
            // https://api.imgbb.com/1/upload?expiration=600&key=YOUR_CLIENT_API_KEY
            // But usually it can also be a form param. Let's follow the URL param style if standard form param fails, 
            // but Axios params is cleaner.

            const response = await axios.post<ImgBBResponse>(IMGBB_UPLOAD_URL, formData, {
                params: {
                    key: IMGBB_API_KEY,
                    // expiration: 600 // Optional: defaults to forever if not set
                }
            });

            if (response.data.success) {
                return response.data.data.url;
            } else {
                console.error("ImgBB upload failed:", response.data);
                return null;
            }
        } catch (error) {
            console.error("Error uploading image to ImgBB:", error);
            return null;
        }
    }
};
